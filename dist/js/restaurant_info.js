let restaurant;
var map;
var bool_favouriteImage ;

/**
 * Callback method for Google Maps
 */
window.initMap = () => {
  if (self.restaurant) {
    return loadMap();
  }
  setTimeout(initMap,49);
}

/**
 * Load restaurant marker into map
 */
window.loadMap = () => {
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 16,
    center: self.restaurant.latlng,
    scrollwheel: false
  });
  DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
}




/**
 * Get restaurant based on page URL
 * @returns {object} Restaurant
 */
fetchRestaurantFromURL = () => {
  return new Promise((resolve, reject) => {

    if (self.restaurant) { // restaurant already fetched!
      return resolve(self.restaurant)
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      error = 'No restaurant id in URL'
      return reject(error);
    } else {
      DBHelper.fetchRestaurantById(id, (error, restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          console.error(error);
          return reject(error);
        }
        DBHelper.getReviews(self.restaurant.id)
        .then((reviews) => {
          self.restaurant.reviews = reviews;
          return resolve(self.restaurant);
        }).catch(e => {
          return reject(e);
        })
      });
    }
  });
}

/**
 * Gathers values from the form and submits it to backend server
 */
submitReviewForm = () => {

  var review = {};
  var formEl = document.getElementById('add-review-form');
  for (var i = 0; i < formEl.length; ++i) {
    var fieldName = formEl[i].name;
    var value = formEl[i].value;
    if (fieldName === "" || value === "") continue;
    if (fieldName === "restaurant_id" || fieldName === "rating") {
      value = parseInt(value);
    }
    review[formEl[i].name] = value;
  }
  formEl.reset();

  // 2. Make the request
  // ================================
  postReview(review);
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazyload'

  var imgurlbase = DBHelper.imageUrlForRestaurant(restaurant);
  var length_image = imgurlbase.length;
  imgurlbase = imgurlbase.substring(0, length_image-5);
  const imgurl1x = imgurlbase + "-500-small.jpeg";
  const imgurl2x = imgurlbase + "-750-medium.jpeg";
  const imgurl3x = imgurlbase+ ".jpeg";
  image.dataset.src = imgurl1x;
  image.dataset.srcset = `${imgurl1x} 320w, ${imgurl2x} 503w, ${imgurl3x} 900w`;
  image.sizes = `(max-width: 503px) 320px, (max-width: 900px) 503px, 900px`;
  image.alt = restaurant.name + " restaurant marketing photograph";			

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}


/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews || !reviews.length) {
    const noReviews = document.createElement('p');
    noReviews.setAttribute('tabindex','0');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const section = document.createElement("section");
  const name = document.createElement('span');
  name.innerHTML = review.name;
  name.classList.add("reviewer-name");
  name.setAttribute('tabindex','0');
  section.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = new Date(review.updatedAt).toLocaleDateString();
  date.classList.add("date");
  date.setAttribute('tabindex','0');
  section.appendChild(date);
  li.appendChild(section);

  const rating = document.createElement('span');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.classList.add("rating");
  rating.setAttribute('tabindex','0');
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute('tabindex','0');
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current','page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


/**
 * favoutir \ Unfavorite current restaurant
 * 
 * click_toggleFavourite click event to PUT favoutir \ Unfavorite current restaurant
*///

click_toggleFavourite = () => {
  self.restaurant.is_favorite = !self.bool_favouriteImage;
  toggle_favouriteimage(self.restaurant.is_favorite) ;
  const url = "http://localhost:1337/restaurants/" + self.restaurant.id + "/?is_favorite=" + (self.restaurant.is_favorite);

  var headers = new Headers();
  headers.set('Accept', 'application/json');
  var fetchOptions = {
    method: 'PUT',
    headers
  };
  fetch(url, fetchOptions)
  .then(DBHelper.updateRestaurants);
} ;

toggle_favouriteimage = (is_favorite) => {
  var favorite11 = document.getElementById('myFavouriteImage');
  if (is_favorite) {
    favorite11.setAttribute('src' , "img/favourite/favourite.png");
    self.bool_favouriteImage = true ;
  }
  else
  {
    favorite11.setAttribute('src' , "img/favourite/unfavourite.png");
    self.bool_favouriteImage = false ;
  }

}


/**
 * Initialize
 */
(()=> {
  fetchRestaurantFromURL()
  .then((restaurant) => {
    DBHelper.getReviews(restaurant.id);
    document.getElementById("restaurant_id").value = restaurant.id;
    fillBreadcrumb();
    var form = document.getElementById('add-review-form');
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitReviewForm();
    })
  
    toggle_favouriteimage(restaurant.is_favorite) ;
    

    document.addEventListener("reviews_updated", e => {
      console.log("Got reviews updated event",e);
      console.log("current restaurant",self.restaurant);
      if (e.detail.restaurant_id === self.restaurant.id) {
        console.log("Updating review list");
        DBHelper.getReviews(self.restaurant.id).then(reviews => {
          self.restaurant.reviews = reviews;
          fillReviewsHTML(reviews);
        })
      }
    });
  })
  .then(fillRestaurantHTML)
  .catch((error) => {
    console.error('Init Error: ', error);
  });
})();


/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**

/**
 * Create restaurant HTML and add it to the webpage

fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazyload'

  var imgurlbase = DBHelper.imageUrlForRestaurant(restaurant);
  var length_image = imgurlbase.length;
  imgurlbase = imgurlbase.substring(0, length_image-5);
  const imgurl1x = imgurlbase + "-500-small.jpeg";
  const imgurl2x = imgurlbase + "-750-medium.jpeg";
  const imgurl3x = imgurlbase+ ".jpeg";
  image.dataset.src = imgurl1x;
  image.dataset.srcset = `${imgurl1x} 320w, ${imgurl2x} 503w, ${imgurl3x} 900w`;
  image.sizes = `(max-width: 503px) 320px, (max-width: 900px) 503px, 900px`;
  image.alt = restaurant.name + " restaurant marketing photograph";			

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}
 */
/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */

