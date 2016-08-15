
function detectLocation(){
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position){
			$("#lat").val(position.coords.latitude);
			$("#lng").val(position.coords.longitude);
			if($("#lat").val() === "" || $("#lng").val() === ""){
				alert("Location unavailable");
			}else{
				searchPlaces();
			}	
		}, function(error){
			alert("Location detection failed. Please turn on location and try again.");
		});
	}else{
		alert("Browser doesn't support Geolocation");
	}
}


function searchPlaces(){
	 var speciality = $("#searchinput").val();
	 var pyrmont = new google.maps.LatLng($("#lat").val(), $("#lng").val());

	 var map = new google.maps.Map(document.getElementById('map'), {
	      center: pyrmont,
	      zoom: 15
	    });
	  
	  if(speciality.endsWith("/ENT")){
		  speciality = "ENT";
	  }else if(speciality == 'Allergology'){
		  speciality = "Allergy";
	  }else if(speciality == ""){
		  speciality = "Hospital";
	  }
	  
	  if(retried == true){
		  speciality = "Hospital";
	  }

	  //Google Place types- https://developers.google.com/places/supported_types
	  //types and 'health' are deprecated. use [type: 'hospital']
	  var request = {
	    location: pyrmont,
	    radius: '2000',
	    query: speciality,
	    types: ['hospital', 'health']
	  };

	  var service = new google.maps.places.PlacesService(map);
	  service.textSearch(request, callback);
}

var mapObjList = [];
var mapObj;
var retried = false;
var placeSelected = "";

function callback(results, status) {
  if (status == google.maps.places.PlacesServiceStatus.OK) {
	  for (var i = 0; i < results.length; i++) {
		 if(i>6) break;
		 mapObj = {};
		 mapObj.id = (i+1);
	     mapObj.name = results[i].name;
	     mapObj.lat = results[i].geometry.location.lat();
	     mapObj.lng = results[i].geometry.location.lng();
	     mapObj.address = results[i].formatted_address;
	     //Place link on Google maps- https://maps.google.com/?q=URLEncode(full address)
	     mapObj.web = "https://maps.google.com/?q="+encodeURIComponent(mapObj.name + " " + mapObj.address);
	     if(results[i].rating){
	    	 mapObj.rating = results[i].rating;
	     }
	     if(results[i].photos && results[i].photos[0]){
	    	 mapObj.photo = results[i].photos[0].getUrl({'maxWidth': 100, 'maxHeight': 100});
	     }
	    	 	    	 
	     mapObjList.push(mapObj);
	  }
	  
	  $('#bh-sl-map-container').storeLocator({
		    'mapSettings': {
				zoom     : 13
			},
			'lengthUnit': 'km',
			'kilometerLang': 'km',
			'kilometersLang': 'kms',
			'originMarker': true,
			'dataRaw': mapObjList,
			'dataType': 'json',
			'slideMap' : false,
			'defaultLoc': true,
			'defaultLat': $("#lat").val(),
			'defaultLng' : $("#lng").val()
			//'autoGeocode': true
				
		});
	  
	  $('html, body').animate({
	        scrollTop: $("#bh-sl-map-container").offset().top
	    }, 1000);
	  
  }else if(status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS && retried == false){
	  retried = true;
	  searchPlaces();
  }else{
	  $('#bh-sl-map-container').html("No results found");
  }
}


function init(){
	if(window.location.search.indexOf("location=") !== -1){
		var params = window.location.search.substring(1);
		var paramsObj = JSON.parse('{"' + decodeURIComponent(params).replace(/\+/g, ' ').replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
		
		$("#searchinput").val(paramsObj.searchinput);
		$("#lat").val(paramsObj.lat);
		$("#lng").val(paramsObj.lng);
		if(paramsObj.location == 'address'){
			$('#location-1').trigger("click");
			$("#pacInput").val(paramsObj.pacInput);
			if($("#lat").val() === "" || $("#lng").val() === "" || $("#pacInput").val() === ""){
				$("#lat").val("");
				$("#lng").val("");
				$("#pacInput").val("");
			}else{
				searchPlaces();
			}	
			placeSelected = $("#pacInput").val();
		}else{
			detectLocation();
		}
	}
}


$(document).ready(function() {
	
	init();

	var substringMatcher = function(strs) {
	  return function findMatches(q, cb) {
	    var matches, substrRegex;

	    // an array that will be populated with substring matches
	    matches = [];

	    // regex used to determine if a string contains the substring `q`
	    substrRegex = new RegExp(q, 'i');

	    // iterate through the pool of strings and for any string that
	    // contains the substring `q`, add it to the `matches` array
	    $.each(strs, function(i, str) {
	      if (substrRegex.test(str)) {
	        matches.push(str);
	      }
	    });

	    cb(matches);
	  };
	};

	var sps = ["Internal Medicine", "Ophthalmology", "Toxicology", "Gastroenterology", "Dermatology", "Infectiology", 
	              "Endocrinology", "Pulmonology", "Nephrology", "Hematology", "Laryngology/ENT", "Cardiology", "Psychiatry", 
	              "Gynecology", "Allergology", "Neurology", "Rheumatology", "Oncology", "Surgery", "Orthopedics", "Urology", 
	              "Angiology", "Dentistry", "Diabetology", "Venereology"];

	$('#searchinput').typeahead({
		  hint: false,
		  highlight: true,
		  minLength: 1
		},
		{
		  name: 'sps',
		  source: substringMatcher(sps)
		}
	);
	
	
	var input = document.getElementById('pacInput');
    var searchBox = new google.maps.places.SearchBox(input);
	
	searchBox.addListener('places_changed', function() {
		$("#lat").val("");
		$("#lng").val("");
        var places = searchBox.getPlaces();

        if (places.length == 0) {
          return;
        }

        places.forEach(function(place) {
          if (!place.geometry) {
            return;
          }
          $("#lat").val(place.geometry.location.lat());
          $("#lng").val(place.geometry.location.lng());
          placeSelected = $("#pacInput").val();
        });
	});
	
	
	//Prevent form submission on hitting enter
	$('#mainForm').on('keyup keypress', function(e) {
	  var keyCode = e.keyCode || e.which;
	  if (keyCode === 13) { 
	    e.preventDefault();
	    return false;
	  }
	});
	
	
	$('#submitBtn').on("click", function(event) {
		event.preventDefault();
		if($('#location-1').is(":checked")){
			if($("#lat").val() === "" || $("#lng").val() === "" || $("#pacInput").val() !== placeSelected 
					|| $("#pacInput").val() === ""){
				alert("Address incorrect");
				return false;
			}
		}else{
			$("#lat").val("");
			$("#lng").val("");
			$("#pacInput").val("");
		}
		$('#mainForm').submit();
	});
	
});
