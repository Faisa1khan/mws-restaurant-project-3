

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
  