var locationList;
var bgwindow;
var DELIMITOR = "-";
var options = {};
var unsavedAddress = false;

function callback() {
    setTimeout(function() {
      $( "#effect:visible" ).removeAttr( "style" ).fadeOut();
      $("#toggler").hide();
    }, 1000 );
  };

function showMessage(text) {
	$("#message").html(text);
	$("#toggler").show();
	$("#effect").show( "highlight", options, 1000, callback );
}

function getKeyFromAddressId(id) {
	log(id);
	log(locationList);
	
	for(i = 0; i< locationList.length;i++) {
		if(locationList[i].id == id) return i;
	}
	return -1;
}
  
function saveAddress(id) {
	name = $("#name" + id).val();
	address = $("#address" + id).val();
	
	if(name == "" || address == "") {
		showMessage("Address not saved. Address or name must not be empty!");
	}

	else {
		if(unsavedAddress != id && unsavedAddress != false) {
			deleteAddressFromUI(unsavedAddress);
			unsavedAddress = false;
			locationList.splice(getKeyFromAddressId(unsavedAddress), 1);
		}
		
		pos = getKeyFromAddressId(id);
		log(pos);
		
		locationList[pos].name = name;
		locationList[pos].address = address;
		locationList[pos].id = id;
		
		writeAddressesToLocalStorage(locationList);
		
		if(unsavedAddress == id) unsavedAddress = false;
		
		$("#address"+DELIMITOR+id+DELIMITOR+"label").html(document.createTextNode("Address: "+name));
		
		showMessage(" Address successful saved: " + name);
		
		updateButton();
	}
}

function cancelAddress(id) {
	pos = getKeyFromAddressId(id);
	
	if(pos != -1)
	{
		address = locationList[pos];
		log(address);
		
		if(address.name != undefined) $("#name" + id).val(address.name);
		if(address.address != undefined) $("#address" + id).val(address.address);
		
		messageString = "Address resetted";
		if(address.name != undefined && address.name != "" && address.name != "undefined") messageString += ": "+address.name;
		showMessage(messageString);
	}
}

function deleteAddressFromUI(id) {
	$("#save-"+id).button("destroy");
	$("#cancel-"+id).button("destroy");
	$("#destroy-"+id).button("destroy");
	
	$("#address"+id).autocomplete("destroy");
	
	$("#address"+DELIMITOR+id+DELIMITOR+"label").remove();
	$("#address"+DELIMITOR+id+DELIMITOR+"content").remove();
}

function delAddress(id) {
	name = locationList[getKeyFromAddressId(id)].name;
	
	$("#accordion").accordion("destroy");
	
	if(unsavedAddress != id && unsavedAddress != false) {
		deleteAddressFromUI(unsavedAddress);
		unsavedAddress = false;
		locationList.splice(getKeyFromAddressId(unsavedAddress), 1);
	}
	
	deleteAddressFromUI(id);
	locationList.splice(getKeyFromAddressId(id), 1);
	writeAddressesToLocalStorage(locationList);
	
	if(unsavedAddress == id) unsavedAddress = false;
	reload();
	
	messageString = "Address deleted";
	if(name != undefined && name != "" && name != "undefined") messageString += ": "+name;
	showMessage(messageString);
}

function updateButton() {
	log("unsaved " + unsavedAddress);
	log("length " + locationList.length);
	if(locationList.length < 5 && unsavedAddress == false) $("#addButton").button("enable");
	else $("#addButton").button("disable");
}

function addNewLocation() {
	id = ++counter;
	
	addAddressUI(id);

	newAddressEntry = new Object();
	newAddressEntry.id = id;
	
	locationList[locationList.length] = newAddressEntry;
	
	writeAddressesToLocalStorage(locationList);
	
	unsavedAddress = id;
	
	reload();
	
	$( "#accordion" ).accordion("option", "active", -1);
}

function addAddressUI(id) {
	$("#accordion").append("<h3 id=\"address"+DELIMITOR+id+DELIMITOR+"label\">Address</h3>");
	
	$("#accordion").append("<div id=\"address"+DELIMITOR+id+DELIMITOR+"content\"><dl><dt>Address:</dt><dd><input type=\"text\" id=\"address"+id+"\" size=\"80\" class=\"NFText\"></dd><dt>Name:</dt><dd><input type=\"text\" id=\"name"+id+"\" size=\"25\" maxlength=\"20\" class=\"NFText\"><button id=\"save"+DELIMITOR+id+"\">Save</button><button id=\"cancel"+DELIMITOR+id+"\">Cancel</button><button id=\"delete"+DELIMITOR+id+"\">Delete</button></dd></dl></div>");
	
	autocomplete("#address"+id);
	
	buttons("#save"+DELIMITOR+id+",#cancel"+DELIMITOR+id+", #delete"+DELIMITOR+id);
}

async function loadUI() {
	locationList = await readInAddresses();
	log("loadUI"+ locationList);
	
	for(var i = 0; i < locationList.length; i++) {
		address = locationList[i];
		
		addAddressUI(address.id);
		
		$("#name" + address.id).val(address.name);
		
		$("#address"+DELIMITOR+address.id+DELIMITOR+"label").html(document.createTextNode("Address: "+address.name));
		
		$("#address" + address.id).val(address.address);
	}
	
	if(locationList.length == 0) addNewLocation();
}

function buttons(buttonSelector) {
    $(buttonSelector).button();
    
    $(buttonSelector).click(function()
    {
    	var button_tokens = this.id.split(DELIMITOR);
    	var btn_action = button_tokens[0];
    	var id = button_tokens[1];

    	log(button_tokens);
		if(btn_action == "save")
		{
			saveAddress(id);
		}
		else if (btn_action == "cancel")
		{
			cancelAddress(id);
		}
		else if (btn_action == "delete")
		{
			delAddress(id);
		}
		else if(btn_action == "addButton")
		{
			$("#accordion").accordion( "destroy" );
			
			addNewLocation();
		}
    });
}

function reload() {
	rebuildAccordion();
	updateButton();
}

$(function()
{
	log("init");
	
	loadUI().then(() =>{
		reload();
	});
	
	if($("#addButton").get(0) == undefined) $("#accordion").after("<button id=\"addButton\">Add address</button>");
	
	$("#toggler").hide();
	$("#effect").hide();
	
	buttons('button[id*="addButton"]');
    
  $( "#options" ).accordion({
	      collapsible: true,
	      //active:true,
	      heightStyle: "content"
	});
	
	$(document).ready(function() {
		
		//options
		//COUNTRY

		readCountryURL().then((country) =>{
			if (country.country == "Default") $("#defaultCountry").attr("selected", "selected");
			else $("#country").val(country.url);
			
			$("#country").change(function () {
				log("countryChange");
				writeCountry($("#country :selected").val(), $("#country :selected").text());
			});

		});

		// TRANSPORT
		getTransportationMode().then((transportMode) => {
			$("input[name='transportationConfig'][value='"+transportMode+"']").attr('checked',true);
		
			$("[name='transportationConfig']").change(function () {
				setTransportationMode($("input[name ='transportationConfig']:checked").val());
			});

		});

		//CONTEXT MENU OPTIONS
		
		getConMenuConfig().then((conMenuConfig) => {
			$("input[name='conMenuConfig'][value='curPos']").attr('checked',conMenuConfig.curPos);
			$("input[name='conMenuConfig'][value='dirSel']").attr('checked',conMenuConfig.dirSel);
			$("input[name='conMenuConfig'][value='dirCurPos']").attr('checked',conMenuConfig.dirCurPos);
			
			$("input[name='conMenuConfig']").change(function () {
				
				var curPos = $("input[name='conMenuConfig'][value='curPos']").prop('checked');
				var dirSel = $("input[name='conMenuConfig'][value='dirSel']").prop('checked');
				var dirCurPos = $("input[name='conMenuConfig'][value='dirCurPos']").prop('checked');
				
				setConMenuConfig(curPos, dirSel, dirCurPos);
			});
		});
		
		var hash = window.location.hash;
	    var anchor = $('a[href$="'+hash+'"]');
	    if (anchor.length > 0){
	        anchor.click();
	        
		    setTimeout(function(){
		    	$(document.body).scrollTop(anchor.offset().top-50);
		    }, 500);
		    //$(document.body).delay(2000).scrollTop(anchor.offset().top+200);
	    }

		if (window.location.href.indexOf('#') != 0) {
			let hash = window.location.href.split('#')[1];
			if(hash) {
				let hashTop = document.querySelector(`#${hash}`).offsetTop;
				console.log(hash);
				scrollToAnchor(hash);
			}
		}
	});
});

function scrollToAnchor(aid){
    var aTag = $("a[name='"+ aid +"']");
    $('html,body').animate({scrollTop: aTag.offset().top},'slow');
}

function autocomplete(selector)
{
	var cache = {};
	
	$(selector).autocomplete({
		minLength: 3,
		highlightItem: true,
		source: function(request, response) {
			if ( request.term in cache ) {
				response( cache[ request.term ] );
				return;
			}
			var lang = window.navigator.language;
			var uri = "https://maps.googleapis.com/maps/api/geocode/json?oe=utf8&sensor=false&key={APIKEY}&hl="+lang+"&address=" + $("#"+this.element[0].id).val();
			log(uri);
			$.ajax({
				url: uri,
				dataType: "json",
				data: request,
				success: function( data ) {
					var suggestEntries = new Array();
					
					for(x in data.results) {
						suggestEntries[suggestEntries.length] = data.results[x].formatted_address;
					} 

					cache[ request.term ] = suggestEntries;
					response( suggestEntries );
				}
			});
		}
	});
}

function rebuildAccordion() {
	$("#accordion").accordion({
        collapsible: true,
        //active:false,
        heightStyle: "content"
      });
}