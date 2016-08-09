	var triggerSearch = true;
	var matches;
	var matchesIds;
	
	//default primary symptom = fever
	var symptId = "s_98"; 
	var userData;
	
	//https://developer.infermedica.com/docs
	var infermedica =  {
			appId : "812a4fc6",
			appKey : "86bdf7046b85f15526383bd3fd4beb03",
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
				console.log(data);
				
				$( "#subForm" ).html($( "#reportTpl" ).render( data ));
				$('#submitBtn').hide();
				
				getConditionInfo(data.name);
			},
			error: function() {
			  alert("Internal Server Error");
			}
	    });
	}
	
	function getConditionInfo(name){
		
		//calling https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=title:<name> 
	    //As CORS is not supported by this service, requesting via proxy
		$.ajax({
			type: "GET",
			url: "/conditionInfo?name="+name,

			success: function(data) {
				 var $xml = $(data),
				 text = $xml.find( "list document content[name='FullSummary']" ).first().text();
				 if(text != ""){
					 $( "#modalLabel" ).html(name);
					 $( "#modalBody" ).html(text);
					 $( "#condInfoBtn" ).show();
				 }
			},
			error: function() {
			  console.log("Error connecting nih.gov");
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
			
			//Getting form data - https://api.jquery.com/serializeArray/
			var formArray = $("#mainForm").serializeArray(); 
			if(userData && userData.evidence){
				//step 1+ - push symptom in evidence array
				$.each(formArray, function( i, v ) {
					userData.evidence.push({ "id": v.name, "choice_id": v.value})
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
							}
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
