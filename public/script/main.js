	var triggerSearch = true;
	//var matches;
	//var matchesIds;
	
	var symptId = ""; 
	var sympt = "";
	var userData;
	
	//https://developer.infermedica.com/docs
	var infermedica =  {
			appId : "60ceee10",
			appKey : "c778feb7044cade07f1e14df456b7483",
			baseUrl : "https://api.infermedica.com/v2/" 
		}; 
	
	
	//Autocomplete box for primary symptom search
	/*function searchSymptoms(q, cb, cbasync) {
		if(triggerSearch){
			return $.ajax({
				type: "GET",
				url: infermedica.baseUrl + "search?phrase=" + q,
				headers: {
					  "app_id": infermedica.appId,
					  "app_key": infermedica.appKey
					},

				success: function(data) {
					matches = [];
					matchesIds = [];
					if(data[0]){
						$.each(data, function( i, value ) {
						   matches.push(value.label); 
						   matchesIds.push(value.id);
						});
					}
					
					//use async callback - https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md#datasets
					return cbasync(matches);
				},
				error: function() {
				  alert("Internal Server Error");
				}
		    });	
		}			
	}*/
	
	function getConditionDetails(cid, cp){
		$.ajax({
			type: "GET",
			url: infermedica.baseUrl + "conditions/" + cid,
			headers: {
				  "app_id": infermedica.appId,
				  "app_key": infermedica.appKey
				},
			contentType: "application/json; charset=utf-8",

			success: function(data) {
				data.probability = Math.round(cp*100) + " %";
				data.category = data.categories[0];
				if(data.name.length > 22){
					data.nameSize = 4;
				}else{
					data.nameSize = 2;
				}
				
				$( "#subForm" ).html($( "#reportTpl" ).render( data ));
				$('#submitBtn').hide();
				
				getWikiInfo(data.name, "#condModalLabel", "#condModalBody");
				getWikiInfo(data.category, "#catModalLabel", "#catModalBody");
			},
			error: function() {
			  alert("Internal Server Error");
			}
	    });
	}
	
	function getWikiInfo(name, modalLabel, modalBody){
		if(name == 'Felon/whitlow'){
			name = 'whitlow';
	    }else if(name == 'Laryngology/ENT'){
	    	name = 'Laryngology';
	    }
		$.ajax({
			type: "GET",
			url: "/wikiInfo?name="+name,

			success: function(data) {
				var notSet = true;
				 if(data.query && data.query.pages){
					 var obj = null;
					 for(var key in data.query.pages) {
					   if(data.query.pages[key]["index"] == 1) {
					     obj = data.query.pages[key];
					     break;
					   }
					 }
					 if(obj && obj.extract){
						 $(modalLabel).html(obj.title);
						 $(modalBody + " p").html(obj.extract);
						 if(obj.thumbnail && obj.thumbnail.source){
							 $(modalBody + " img").attr("src", obj.thumbnail.source);
						 }
						 notSet = false;
					 }
				 }
				 if(notSet){
					 $(modalLabel).html(name);
					 $(modalBody).html("No details found.");
				 }
				 
			},
			error: function() {
			  console.log("Error connecting wikipedia");
			  $(modalLabel).html(name);
			  $(modalBody).html("Error finding details.");
			}
	    });
	}
	
	
	$(document).ready(function() {
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
		
		
		$('#searchinput').typeahead({
			hint : false,
			highlight : true,
			minLength : 1
		}, {
			name : 'symptom',
			//source : searchSymptoms
			source : substringMatcher(symptoms)
		});
		
		
		//Optimize autocomplete - don't trigger search for space and backspace
		/*$('#searchinput').bind("keydown", function (event) {
		    var keyCode = event.keyCode;

		    if(keyCode == 8 || keyCode ==32){
		    	triggerSearch = false;
		    }else{
		    	triggerSearch = true;
		    }
		});*/
		
		//Listen to a typeahead event for suggestion selection and capture the symptom Id
		$('#searchinput').bind('typeahead:select', function(ev, suggestion) {
		  var index = $.inArray(suggestion, symptoms);
		  if(index > -1){
			  symptId = symptomIds[index];
			  sympt = suggestion;
		  }
		});
		
		//Age textbox - allow just positive integer numbers max 2 digit
		$('#age').bind("keypress", function (event) {
		    var keyCode = event.keyCode;
		    if($.inArray(keyCode, [43,44,45,46,101]) != -1){
		    	return false;
		    }
		    if($(this).val().length >= 2) return false;
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
			
			/*getConditionDetails("c_569", 0.9);
			return;*/
			
			//Getting form data - https://api.jquery.com/serializeArray/
			var formArray = $("#mainForm").serializeArray(); 
			if(userData && userData.evidence){
				//step 1+ - push symptom in evidence array
				$.each(formArray, function( i, v ) {
					userData.evidence.push({ "id": v.name, "choice_id": v.value});
				});
			}else{			
				//step 0 - capture age,gender and primary symptom
				if(formArray[1].value == ""){
					alert("Please provide age");
					return false;
				}
				if(formArray[3].value == ""){
					alert("Please provide symptom");
					return false;
				}
				if(symptId == "" || sympt != formArray[3].value){
					alert("Please select a symptom from the suggestions");
					return false;
				}
				
				userData = { 
							"sex": formArray[2].value, 
							"age": formArray[1].value, 
							"evidence": [{ "id": symptId, "choice_id": "present"} ] 						    
							};
			}
			
			
			$.ajax({
				type: "POST",
				url: infermedica.baseUrl + "diagnosis",
				headers: {
					  "app_id": infermedica.appId,
					  "app_key": infermedica.appKey
					},
				contentType: "application/json; charset=utf-8",
				dataType: "json",
				data: JSON.stringify(userData),

				success: function(data) {
					//Stop condition
					if(data.conditions && data.conditions[0]){
						if(data.conditions[0].probability > 0.9 || userData.evidence.length > 20){
							getConditionDetails(data.conditions[0].id, data.conditions[0].probability);
							return;
						}
					}
					
					//Render next question based on type 'group_multiple' or 'single'
					if(data.question && data.question.items && data.question.items[0]){
						if(data.question.type == 'group_multiple' || data.question.type == 'group_single'){
							$( "#subForm" ).html($( "#multiTpl" ).render( data.question ));
						}else{
							$("#subForm").html($("#singleTpl").render( {name: data.question.text, id: data.question.items[0].id} ));
						}						
					}
				},
				error: function() {
				  alert("Internal Server Error");
				}
		    });
			
			
		  });
		
	});
