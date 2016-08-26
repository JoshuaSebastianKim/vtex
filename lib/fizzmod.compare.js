//#! babel

// Fizzmod Product Compare for Vtex
// Author: Joshua Sebastian Kim

(function($, Fizzmod, window, undefined) {
	let Compare = {
		items: [],

		cookieName: "FizzmodCompareItems",
		cookieExpirationTime: 1, // Days

		events: {
			INIT: "Fizzmod.Compare.Initialized",
			ITEM_ADDED: "Fizzmod.Compare.ItemAdded",
			ITEM_REMOVED: "Fizzmod.Compare.ItemRemoved",
			ITEMS_UPDATED: "Fizzmod.Compare.ItemsUpdated"
		},

		errors: {
			"itemIdNotDefined": "Item ID is not defined",
			"itemIdNotFound": "Item ID was not found in 'items' array",
			"itemAlreadyAdded": "Item ID was already found in 'items' array",
			"noItems": "No items fount in 'items'",
			"itemsObjectsArrayNotDefined": "'itemsObjectsArray' is not defined",
			"itemsObjectsArrayNotAnArray": "'itemsObjectsArray' is not an array",
			"noWantedSpecifications": "No specifications found in products"
		},

		options: {
			log: false
		},

		/**
		 * Initialize the compare
		 * This method must me called first, if we send the 'itemIdArray'
		 * it will overwrite the items stored in the cookie
		 * -fires trigger#ITEMS_UPDATED
		 * -fires trigger#INIT
		 * @param  {Array} itemIdArray Arrat of the items to compare
		 * @return {Object}            Returns this
		 */
		init: function(itemIdArray) {
			// Get cookie with previus selections
			let cookieItems = Fizzmod.Utils.getCookie(this.coockieName);

			if(cookieItems) {
				// Store cookie items in items property
				this.items = cookieItems;

				// Trigger updated event
				this.trigger(this.events.ITEMS_UPDATED, JSON.stringify(this.items));
			}

			if(Array.isArray(itemIdArray) && itemIdArray.length) {
				this.items = itemIdArray;

				// Trigger updated event
				this.trigger(this.events.ITEMS_UPDATED, JSON.stringify(this.items));
			}

			// On items updated store cookie
			$(window).on("Fizzmod.Compare.ItemsUpdated", (events, items) => Fizzmod.Utils.setCookie(this.coockieName, items, this.cookieExpirationTime));

			// Trigger initialize event
			this.trigger(this.events.INIT, JSON.stringify(this.items));

			return this;
		},

		// Event dispatcher
		trigger: function(event, data) {
			this.log(event);
			$(window).trigger(event, data);
		},

		// Show error on console
		error: function(type, data) {
			this.log(this.errors[type]);

			if(data) {
				this.log(`Data: ${data}`);
			}
		},

		log: function(log) {
			if(this.options.logs)
				console.log(log);
		},

		search: function(params, data = {}, headers = {}) {
			return $.ajax({
				"url": "/api/catalog_system/pub/products/search/?" + params,
				"data": data,
				beforeSend: function(xhr) {
					for (let header in headers) {
						xhr.setRequestHeader(header, headers[header]);
					}
				}
			});
		},

		/**
		 * Get compare items ID
		 * @return {Array<String>} Array of Strings with the ID of the items
		 */
		getItems: function() {
			return this.items;
		},

		/**
		 * Adds an item to compare
		 * -fires  trigger#ITEM_ADDED
		 * -fires  trigger#ITEMS_UPDATED
		 * @param  {String} itemId ID of the item
		 * @return {Array<String>} Array of Strings with the ID of the items
		 */
		addItem: function(itemId) {
			if(!itemId)
				return this.error("itemIdNotDefined");


			if(this.items.indexOf(itemId) != -1)
				return this.error("itemAlreadyAdded");

			// Push item ID
			this.items.push(itemId);

			// Trigger added event
			this.trigger(this.events.ITEM_ADDED, itemId);

			// Trigger updated event
			this.trigger(this.events.ITEMS_UPDATED, JSON.stringify(this.items));

			// Return items array
			return this.items;
		},

		/**
		 * Removes an item to compare
		 * -fires  trigger#ITEM_REMOVED
		 * -fires  trigger#ITEMS_UPDATED
		 * @param  {String} itemId ID of the item
		 * @return {Array<String>} Array of Strings with the ID of the items
		 */
		removeItem: function(itemId) {
			if(!itemId)
				return this.error("itemIdNotDefined");

			if(this.items.indexOf(itemId) == -1)
				return this.error("itemIdNotFound");

			let indexOf = this.items.indexOf(itemId);

			// Splice item ID
			this.items.splice(indexOf, 1);

			// Trigger removed event
			this.trigger(this.events.ITEM_REMOVED, itemId);

			// Trigger updated event
			this.trigger(this.events.ITEMS_UPDATED, JSON.stringify(this.items));

			// Return items array
			return this.items;
		},

		/**
		 * Gets the specifications of the item
		 * @param  {String} itemId ID of the item
		 * @return {Promise}       Promise with search results
		 */
		getItemSpecifications: function(itemId) {
			// Search parameters
			let params = `fq=productId:${itemId}`;

			// Return promise
			return this.search(params);
		},

		/**
		* Gets the specifications of an Array of Items
		 * @param  {Array<String>} [itemIdArray=this.items] Array of Strings with the ID of the items
		 * @return {Promise}       Promise with search results
		 */
		getItemsSpecifications: function(itemIdArray = this.items) {
			if(!itemIdArray.length)
				return this.error("noItems");

			// Search parameters
			let params = "";

			// Loop every item and add it to the search paramenters
			for(let i = 0; i < itemIdArray.length; i++) {
				params += `fq=productId:${itemIdArray[i]}&`
			}

			// Return promise
			return this.search(params);
		},

		/**
		 * The cache of the comparing specifications
		 * @type {Object}
		 * @public
		 */
		cacheSpecs: {},

		wantedSpecs: [],
		groupSpecs: {},

		/**
		 * Array of unwanted specifications to compare
		 * @type {Array}
		 * @public
		 */
		unwantedSpecs: ["allSpecifications", "categories", "description", "items", "link", "linkText", "productId", "productName", "productReference", "Info General"],

		/**
		 * Compares the items
		 * This method compare each object properties and filter
		 * the unwantedSpecs
		 * @param  {Array} itemsObjectsArray Array of item Objects
		 * @return {Object}                  Object with compare data
		 */
		compareItems: function(itemsObjectsArray) {
			if(!itemsObjectsArray)
				return this.error("itemsObjectsArrayNotDefined");

			if(!Array.isArray(itemsObjectsArray))
				return this.error("itemsObjectsArrayNotAnArray");

			// GENERATE THE WANTED SPECIFICATIONS FOR LATER COMPARISON
			// Loop each item object
			for(let i = 0; i < itemsObjectsArray.length; i++) {
				// Loop every the every allSpecifications property for listing
				let allSpecifications = itemsObjectsArray[i].allSpecifications;

				if(allSpecifications) {
					for(let z = 0; z < allSpecifications.length; z++) {
						// Check if spec was stored and it is not in the unwantedSpecs array
						if(this.wantedSpecs.indexOf(allSpecifications[z]) == -1 && this.unwantedSpecs.indexOf(allSpecifications[z]) == -1) {
							this.wantedSpecs.push(allSpecifications[z]);
						}
					}
				}

				// Add brand if not present in wantedSpecs and in unwantedSpecs
				if(this.wantedSpecs.indexOf("brand") == -1 && this.unwantedSpecs.indexOf("brand") == -1) {
					this.wantedSpecs.push("brand");
				}
			}

			// Throw error if no wanted specs found
			if(!this.wantedSpecs.length)
				return this.error("noWantedSpecifications");

			let comparedSpecifications = {};

			// GENERATE THE OBJECT WITH COMPARISON VALUES
			for(let i = 0; i < itemsObjectsArray.length; i++) {
				let item = itemsObjectsArray[i];

				// Loop every the every wantedSpecs
				for(let z = 0; z < this.wantedSpecs.length; z++) {
					let specName = this.wantedSpecs[z];

					// Create property if new
					if(comparedSpecifications[specName] == undefined)
						comparedSpecifications[specName] = {};

					// Check if item has property if not, set value in object to null
					if(item[specName]) {
						// Add item spec value in cacheSpecs
						comparedSpecifications[specName][item.productId] = item[specName].toString();
					} else {
						comparedSpecifications[specName][item.productId] = null;
					}
				}
			}

			// Extend cache specs
			$.extend(this.cacheSpecs, comparedSpecifications);

			return comparedSpecifications;
		}
	};

	Fizzmod.Compare = Compare;

})(jQuery, Fizzmod, window);
