//#! babel

// Fizzmod Catalog for Vtex
// Author: Joshua Sebastian Kim

(function($, Fizzmod, checkout, window, undefined) {
	let Catalog = {
		maxParamsPerRequest: 50,

		productCache: {},

		// To avoid looping the products in cache in order to find the
		// needed sku, use this object to store the product ID of each
		// sku ID
		skusProductIds: {},

		events: {
		},

		errors: {
			"searchParamsNotDefined": "Search parameters is not defined",
			"paramsNotAnObject": "Param is not a valid Object",
			"productIdNotDefined": "Product ID is not defined",
			"skuIdNotDefined": "Sku ID is not defined",
			"productIdArrayNotAnArray": "'productIdArray' is not an array",
			"skuIdArrayNotAnArray": "'skuIdArray' is not an array",
			"productIdArrayNotDefined": "'productIdArray' is not an defined",
			"skuIdArrayNotDefined": "'skuIdArray' is not an defined",
			"fqPropertyNotFound": "The property 'fq' was not found"
		},

		// Event dispatcher
		trigger: function(event, data) {
			$(window).trigger(event, data);
		},

		// Show error on console
		error: function(type, data) {
			console.log(this.errors[type]);

			if(data) {
				console.log("Data:", data);
			}
		},

		init: function() {
			return this;
		},

		/**
		 * Search products in Catalog
		 * @param  {Object} params       Object with search parameters. Valid params: C:/{a}/{b} (Category), fq=specificationFilter_{a}:{b} (Filter), fq=P:[{a} TO {b}] (Price)
		 * @param  {Object} [headers={}] Request headers
		 * @return {Promise}             Promise with search results
		 */
		search: function(params, headers = {}) {
			if(!params)
				return this.error("searchParamsNotDefined");

			if(typeof params != "object")
				return this.error("paramsNotAnObject");

			if(!params.fq)
				return this.error("fqPropertyNotFound");

			let paramsLength = 1;

			// If params fq is an array get the length
			if(Array.isArray(params.fq))
				paramsLength = params.fq.length;

			let requestAmount = Math.ceil(paramsLength / this.maxParamsPerRequest);

			// Request array
			let xhrArray = [];

			// Product data object to resolve
			let productData = [];

			// Loop for each requestAmount
			for(let i = 0; i < requestAmount; i++) {
				let resources = `${i * this.maxParamsPerRequest}-${((i + 1) * this.maxParamsPerRequest) - 1}`;

				let xhr = $.ajax({
					"url": "/api/catalog_system/pub/products/search/",
					"data": $.param(params, true),
					beforeSend: function(xhr) {
						for (let header in headers) {
							xhr.setRequestHeader(header, headers[header]);
						}

						// Set resources header
						xhr.setRequestHeader("resources", resources);
					}
				});

				// Push request to request array
				xhrArray.push(xhr);
			}

			// Deferred object to send custom object in a promise
			let dfd = $.Deferred();

			// When resolve the productData object
			$.when(xhrArray).done((requests) => {
				let doneRequestAmount = 0;

				// Loop the requests to store in cache the product data
				for(let i = 0; i < requests.length; i++) {
					let xhr = requests[i];

					// When the request is done store in productCache
					xhr.done(products => {
						for(let i = 0; i < products.length; i++) {
							// Store product data in cache
							this.productCache[products[i].productId] = products[i];

							// Push products results into productData
							productData.push(products[i]);

							// Store the IDs of the skus
							let items = products[i].items;

							for(let k = 0; k < items.length; k++) {
								// Add skuId with the product id in the skusProductIds object
								this.skusProductIds[items[k].itemId] = products[i].productId;
								// console.log("itemId", items[i].itemId);
							}
						}

						// On the last loop resolve
						doneRequestAmount++;

						if(doneRequestAmount == requests.length) {
							dfd.resolve(productData);
						}
					});
				}

			});

			return dfd.promise();
		},

		/**
		 * Search by product ID
		 * @param  {Number} productId ID of the product to search
		 * @return {Promise} 					Promise with search results
		 */
		searchProduct: function(productId) {
			if(!productId)
				return this.error("productIdNotDefined");

			let dfd = $.Deferred();

			// Check if productId is in cache
			if(this.productCache[productId]) {
				dfd.resolve(this.productCache[productId]);
			} else {
				// Search product
				let params = {
					"fq": `productId:${productId}`
				};

				let search = this.search(params);

				// Since it should be only 1 item set index is 0
				search.done(products => dfd.resolve(products[0]));
			}

			return dfd.promise();
		},

		/**
		 * Search by sku ID
		 * @param  {Number} skuId ID of the sku to search
		 * @return {Promise} 			Promise with search results
		 */
		searchSku: function(skuId) {
			if(!skuId)
				return this.error("skuIdNotDefined");

			let dfd = $.Deferred();

			// Check if skuId is in skusProductIds map
			if(this.skusProductIds[skuId]) {
				dfd.resolve(this.productCache[this.skusProductIds[skuId]]);
			} else {
				// Search product
				let params = {
					"fq": `skuId:${skuId}`
				};

				let search = this.search(params);

				// Since it should be only 1 item set index is 0
				search.done(products => dfd.resolve(products[0]));
			}

			return dfd.promise();
		},

		/**
		 * Search by product ID array
		 * @param  {Array} productIdArray Array IDs of the prodcuts to search
		 * @return {Promise} 							Promise with search results
		 */
		searchProductArray: function(productIdArray) {
			if(!productIdArray)
				return this.error("productIdArrayNotDefined");

			if(!Array.isArray(productIdArray))
				return this.error("productIdArrayNotAnArray");

			let dfd = $.Deferred();

			// Product data object to resolve
			let productData = {};

			// Request product params
			let params = {
				"fq": []
			};

			for (let i = 0; i < productIdArray.length; i++) {
				// Check if product was already gotten
				// If not add productId into the params object
				if (this.productCache[productIdArray[i]] == undefined) {
					params.fq.push(`productId:${productIdArray[i]}`);
				} else {
					// If gotten add it into the productData
					productData[productIdArray[i]] = this.productCache[productIdArray[i]];
				}
			}

			if (params.fq.length) {
				let search = this.search(params);

				search.done(products => {
					// Loop product data
					for(let i = 0; i < products.length; i++) {
						productData[products[i].productId] = products[i];
					}

					dfd.resolve(productData)
				});
			} else {
				dfd.resolve(productData);
			}

			return dfd.promise();
		},

		/**
		 * Search by sku ID array
		 * @param  {Array} skuIdArray Array IDs of the skus to search
		 * @return {Promise} 					Promise with search results
		 */
		searchSkuArray: function(skuIdArray) {
			if(!skuIdArray)
				return this.error("skuIdArrayNotDefined");

			if(!Array.isArray(skuIdArray))
				return this.error("skuIdArrayNotAnArray");

			let dfd = $.Deferred();

			// Product data object to resolve
			let productData = {};

			// Request product params
			let params = {
				"fq": []
			};


			for (let i = 0; i < skuIdArray.length; i++) {
				// Check if sku was already gotten
				// If not add skuId into the params object
				if(!this.skusProductIds[skuIdArray[i]]) {
					params.fq.push(`skuId:${skuIdArray[i]}`);
				} else {
					let productId = this.skusProductIds[skuIdArray[i]];

					productData[productId] = this.productCache[productId];
				}
			}

			if (params.fq.length) {
				let search = this.search(params);

				search.done(products => {
					// Loop product data
					for(let i = 0; i < products.length; i++) {
						productData[products[i].productId] = products[i];
					}

					dfd.resolve(productData)
				});
			} else {
				dfd.resolve(productData);
			}

			return dfd.promise();
		},

		/**
		 * Search products from a category
		 * @param  {Object} params An Object with the category search param and pricerRange if necessary
		 * @return {Promise} 					Promise with search results
		 */
		searchCategory: function(params) {
			if(!params)
				return this.error("searchParamsNotDefined");

			if(typeof params != "object")
				return this.error("paramsNotAnObject");

			if(!params.fq)
				return this.error("fqPropertyNotFound");

			// Generate map parameter
			let mapParam = {
				map: []
			};

			// Loop each parameter
			for(let i = 0; i < params.fq.length; i++) {
				let param = params.fq[i];

				// If param is the category one
				if(param.match("C:")) {
					// Generate a 'c' param in the 'mapParam' for each category
					let categoryIds = param.split("/");

					for(let z = 0; z < categoryIds.length; z++) {
						// If the 'categoryId' is a number
						if(categoryIds[z].match(/\d.+/gi))
							mapParam.map.push("c")
					}
				}

				// If param is priceFrom
				if(param.match(/P\[.+[\d\w\s]?\]/g)) {
					mapParam.map.push("priceFrom")
				}
			}

			// Join mapParam map to generate a string and push it into the params object
			mapParam.map = mapParam.map.join(",");

			// Join params and mapParam
			$.extend(params, mapParam);

			// Search
			let search = this.search(params);

			return search;
		}
	}

	// Extend Fizzmod Class
	Fizzmod.Catalog = Catalog;

})(jQuery, Fizzmod, vtexjs.checkout, window);
