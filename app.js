//lightweight web server
var express = require('express');

//HTTP client - https://www.npmjs.com/package/request
var request = require("request");

var app = express();

app.use(express.static('public'));


app.get('/', function (req, res) {
  res.sendfile('public/index.html');;
});

app.get('/conditionInfo', function (req, res) {
   if (req.query.name && req.query.name !== ""){
	   request({
			url: "https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=title:"+req.query.name
			
		  }, function (error, response, data) {

			if (!error && response.statusCode === 200) {	
				res.contentType('application/xml');
				res.send(data);
			}
		  });
   }else{
	    res.sendStatus(400);
   }
});


app.get('/wikiInfo', function (req, res) {
   if (req.query.name && req.query.name !== ""){
	   request({
			url: "https://en.wikipedia.org/w/api.php?format=json&action=query&generator=search"
				+"&gsrlimit=3&prop=pageimages|extracts&pilimit=max&exintro&explaintext&exsentences=2"
				+"&exlimit=max&pithumbsize=300&gsrsearch="+req.query.name
			
		  }, function (error, response, data) {

			if (!error && response.statusCode === 200) {	
				res.contentType('application/json');
				res.send(data);
			}
		  });
   }else{
	    res.sendStatus(400);
   }
});


app.listen(process.env.VCAP_APP_PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});


