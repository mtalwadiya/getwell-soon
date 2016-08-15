	var triggerSearch = true;
	var matches;
	var matchesIds;
	
	//default primary symptom = fever
	var symptId = "s_98"; 
	var userData;
	
	//https://developer.infermedica.com/docs
	var infermedica =  {
			appId : "60ceee10",
			appKey : "c778feb7044cade07f1e14df456b7483",
			baseUrl : "https://api.infermedica.com/v2/" 
		}; 
	
	
	//Autocomplete box for primary symptom search
	function searchSymptoms(q, cb, cbasync) {
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
	}
	
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
				
				getConditionInfo(data.name);
				getCategoryInfo(data.category);
			},
			error: function() {
			  alert("Internal Server Error");
			}
	    });
	}
	
	function getCategoryInfo(name){
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
						 $( "#catModalLabel" ).html(obj.title);
						 $( "#catModalBody p" ).html(obj.extract);
						 if(obj.thumbnail && obj.thumbnail.source){
							 $( "#catModalBody img" ).attr("src", obj.thumbnail.source);
						 }
						 notSet = false;
					 }
				 }
				 if(notSet){
					 $( "#catModalLabel" ).html(name);
					 $( "#catModalBody" ).html("No details found.");
				 }
				 
			},
			error: function() {
			  console.log("Error connecting wikipedia");
			  $( "#catModalLabel" ).html(name);
			  $( "#catModalBody" ).html("Error finding details.");
			}
	    });
	}
	
	
	function getConditionInfo(name){
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
						 $( "#condModalLabel" ).html(obj.title);
						 $( "#condModalBody p" ).html(obj.extract);
						 if(obj.thumbnail && obj.thumbnail.source){
							 $( "#condModalBody img" ).attr("src", obj.thumbnail.source);
						 }
						 notSet = false;
					 }
				 }
				 if(notSet){
					 $( "#condModalLabel" ).html(name);
					 $( "#condModalBody" ).html("No details found.");
				 }
				 
			},
			error: function() {
			  console.log("Error connecting wikipedia");
			  $( "#condModalLabel" ).html(name);
			  $( "#condModalBody" ).html("Error finding details.");
			}
	    });
	}
	
	
	$(document).ready(function() {
		$('#searchinput').typeahead({
			hint : false,
			highlight : true,
			minLength : 3
		}, {
			name : 'symptom',
			source : searchSymptoms
		});
		
		
		//Optimize autocomplete - don't trigger search for space and backspace
		$('#searchinput').bind("keydown", function (event) {
		    var keyCode = event.keyCode;

		    if(keyCode == 8 || keyCode ==32){
		    	triggerSearch = false;
		    }else{
		    	triggerSearch = true;
		    }
		});
		
		//Listen to a typeahead event for suggestion selection and capture the symptom Id
		$('#searchinput').bind('typeahead:select', function(ev, suggestion) {
		  var index = $.inArray(suggestion, matches);
		  if(index > -1){
			  symptId = matchesIds[index];
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
			
			/*getConditionDetails("c_614", 0.9);
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
