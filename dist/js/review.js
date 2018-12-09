

  /**
   * Event method fired when solution goes online
   * Makes sure that any offline reviews gets submitted to the server
   */
  onOnline = () => {
    document.querySelector('body').classList.remove('offline');
    DBHelper.getOfflineReviews().then(reviews => {
      DBHelper.clearOfflineReviews().then(() => {
        reviews.forEach((review) => postReview(review.data));
      })
    });
  }
  
  /**
   * Event method fired when solution goes offline
   * Adds a visual indication to the site that we are offline
   */
  onOffline = () => {
    document.querySelector('body').classList.add('offline');
  }
  
  /**
   * Submit a review to the server - Stores it offline if it fails.
   */
  postReview = (pReview) => {
    var headers = new Headers();
    // Tell the server we want JSON back
    headers.set('Accept', 'application/json');
    var data = new FormData();
  
    for (var k in pReview){
      if (pReview.hasOwnProperty(k)) {
        data.append(k,pReview[k]);
      }
    }
  
    var url = 'http://localhost:1337/reviews/';
    var fetchOptions = {
      method: 'POST',
      headers,
      body: data
    };
  
    var responsePromise = fetch(url, fetchOptions);
    responsePromise.then((response) => response.json())
    .then(review => {
      review.restaurant_id = parseInt(review.restaurant_id);
      review.rating = parseInt(review.rating);
      DBHelper.updateReviews(review.restaurant_id)
    }).catch(e => {
      console.error(e);
      DBHelper.storeOfflineReview(pReview);
    })
  }
  
  window.addEventListener('online',  onOnline);
  window.addEventListener('offline', onOffline);
  
/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

/**
 * Open the local database and run migrations if needed
 *
 * 
 */
static openDatabase() {
    return idb.open("MWS", 3, function(upgradeDb) {
      switch(upgradeDb.oldVersion) {
        case 0:
        case 1:
          var restaurants = upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
          restaurants.createIndex('cuisine','cuisine_type');
          restaurants.createIndex('neighborhood','neighborhood');
        case 2:
          console.log("Upgrading to DB v2.0");
          var reviews = upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          reviews.createIndex('restaurant','restaurant_id');
        case 3:
          console.log("Upgrading to DB v3.0");
          var offline_reviews = upgradeDb.createObjectStore('offline_reviews', {keyPath: 'id'});
      }
    });
  }

  /**
   * Get all restaurants
   * Updates locally cached restaurants if list is empty
   *
   * 
   */
  static getRestaurants() {
    return new Promise((resolve,reject) => {

      DBHelper.openDatabase().then(db => {
        let tx = db.transaction('restaurants');
        let store = tx.objectStore('restaurants');
        store.getAll().then(restaurants => {
          if (restaurants && restaurants.length > 0) {
            resolve(restaurants);
          } else {
            DBHelper.updateRestaurants().then(listFromWeb => {
              resolve(listFromWeb);
            }).catch(reject);
          }
        });
      }).catch(reject);
    });
  }

  /**
   * Get offline-first reviews for restaurant
   * Updates reviews from server if list is empty
   *
   *
   */
  static getReviews(restaurantId) {
    return new Promise((resolve,reject) => {

      DBHelper.openDatabase().then(db => {
        let tx = db.transaction('reviews');
        let store = tx.objectStore('reviews').index('restaurant');
        store.getAll(restaurantId).then(result => {
          if (result && result.length > 0) {
            resolve(result);
          } else {
            DBHelper.updateReviews(restaurantId).then(listFromWeb => {
              resolve(listFromWeb);
            }).catch(reject);
          }
        });
      }).catch(reject);
    });
  }
/**
 * Update locally cached reviews for restaurant
 *
 * 
 */
static updateReviews(restaurantId) {
    return new Promise((resolve,reject) => {

      fetch(DBHelper.DATABASE_URL + '/reviews?restaurant_id=' + restaurantId)
      .then(response => {
        response.json()
        .then(data => {
          DBHelper.openDatabase()
          .then(db => {
            var tx = db.transaction("reviews", "readwrite");
            var store = tx.objectStore("reviews");
            data.forEach(element => {
              element.restaurant_id = parseInt(element.restaurant_id);
              element.rating = parseInt(element.rating);
              store.put(element);
            });
          });
          var event = new CustomEvent("reviews_updated", {detail: {restaurant_id: restaurantId}});
          document.dispatchEvent(event);
          return resolve(data);
        });
      });

    })
  }
/**
 * Save a review to the offline cache
 *
 * 
 */
static storeOfflineReview(review) {
    DBHelper.openDatabase().then(db => {
      var tx = db.transaction("offline_reviews","readwrite");
      var store = tx.objectStore("offline_reviews");
      store.add({id: Date.now(), data: review});
    })
  }
/**
 * Get reviews stored while offline
 *
 * @static
 * @returns {Promise{review}} A promise with reviews
 * @memberof DBHelper
 */
static getOfflineReviews() {
    return new Promise((resolve,reject) => {
      DBHelper.openDatabase().then(db => {
        var tx = db.transaction("offline_reviews");
        var store = tx.objectStore("offline_reviews");
        store.getAll().then(data => {
          return resolve(data);
        }).catch(e => {
          reject(e);
        });
      })
    })
  }
/**
 * Delete new reviews that are stored locally
 *
 *
 */
static clearOfflineReviews() {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase().then(db => {
        var tx = db.transaction("offline_reviews", "readwrite");
        tx.objectStore("offline_reviews").clear();
        return resolve();
      }).catch(reject);
    });
  }

  /**
   * Update offline restaurants from database
   *
   * 
   */
  static updateRestaurants() {
    return new Promise((resolve,reject) => {

      fetch(DBHelper.DATABASE_URL + '/restaurants')
      .then(response => {
        response.json()
        .then(restaurants => {
          DBHelper.openDatabase()
          .then(db => {
            var tx = db.transaction("restaurants", "readwrite");
            var store = tx.objectStore("restaurants");
            restaurants.forEach(element => {
              element.is_favorite = element.is_favorite ? (element.is_favorite.toString() == "true" ? true : false) : false;
              store.put(element);
            });
          });
          DBHelper.updateReviews();
          return resolve(restaurants);
        });
      });

    })

  }

  /**
   * Get locally cached restaurant by id
   *
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.openDatabase()
    .then(db => {
      let tx = db.transaction('restaurants');
      let store = tx.objectStore('restaurants');
      store.get(parseInt(id))
      .then(result => {
        callback(null,result);
      }).catch((e) => {
        callback(e,null)
      });
    });
  }
/**
 * Get the locally cached reviews for restaurant
 *
 * 
 */
static fetchReviewsForRestaurantId(id) {
    return new Promise((resolve, reject) => {
      DBHelper.openDatabase()
      .then(db => {
        let tx = db.transaction('reviews');
        let store = tx.objectStore('reviews').index('restaurant');
        return store.getAll(parseInt(id))
      .then(resolve)
      .catch((e) => {
        console.error('Could not get reviews for Restaurant', e);
        resolve([]);
      });
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    DBHelper.openDatabase().then(db => {
      let tx = db.transaction('restaurants');
      let store = tx.objectStore('restaurants').index('cuisine');
      return store.get(cuisine);
    }).then(result => {
      callback(null,result);
    }).catch((e) => {
      callback(e,null)
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.openDatabase().then(db => {
      let tx = db.transaction('restaurants');
      let store = tx.objectStore('restaurants').index('neighborhood');
      return store.get(neighborhood);
    }).then(result => {
      callback(null,result);
    }).catch((e) => {
      callback(e,null)
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants

    DBHelper.getRestaurants().then(results => {
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      callback(null,results);
    }).catch((e) => {
      callback(e,null)
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    DBHelper.getRestaurants().then(result => {
      const neighborhoods = result.map((v, i) => result[i].neighborhood)
      callback(null,neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i));
    })
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.getRestaurants().then(result => {
      const cuisines = result.map((v, i) => result[i].cuisine_type)
      callback(null,cuisines.filter((v, i) => cuisines.indexOf(v) == i));
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static webPImageUrlForRestaurant(restaurant) {
    return (`dist/img/webp/${restaurant.photograph}.webp`);
  }
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpeg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
/*
   static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}


/*
Copyright 2018 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var request = (this._store || this._index)[funcName].apply(this._store, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());
