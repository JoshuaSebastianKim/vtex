//#! babel

// Fizzmod OrderForm for Vtex
// Author: Joshua Sebastian Kim

(function($, Fizzmod, checkout, window, undefined) {
	let OrderForm = {
		/**
		 * Current orderForm data
		 * @type {Object}
		 * @public
		 */
		orderForm: undefined,

		/**
		 * EVENTS
		 * INIT 					-> OrderForm initialization
		 * REQUEST_BEGIN 	-> Beginning of request
		 * REQUEST_END 		-> End of request
		 * UPDATED:				-> OrderForm data update
		 * @type {Object}
		 */
		events: {
			VTEX_ORDER_FORM_UPDATED: "orderFormUpdated.vtex",
			VTEX_REQUEST_BEGIN: "checkoutRequestBegin.vtex",
			VTEX_REQUEST_END: "checkoutRequestEnd.vtex",
			INIT: "Fizzmod.OrderForm.Initialized",
			REQUEST_BEGIN: "Fizzmod.OrderForm.requestBegin",
			REQUEST_END: "Fizzmod.OrderForm.requestEnd",
			UPDATED: "Fizzmod.OrderForm.Updated"
		},

		errors: {
			"undefinedOrderForm": "orderForm is not defined",
			"indexNotDefined": "Index is not defined",
			"indexNotFound": "Index wasn't found in the orderForm",
			"dataNotDefined": "Data is not defined",
			"itemArrayNotDefined": "itemArray is not defined",
			"itemArrayNotAnArray": "itemArray is not an array"
		},

		/**
		 * Initialize the minicart
		 * This method gets the orderForm
		 * -fires trigger#INIT
		 * @return {Object}            Returns this
		 */
		init: function() {
			// Catch vtex events
			this._vtexEvents();
			// Get order form and trigger INIT event after it
			this.getOrderForm().done(orderForm => this._trigger(this.events.INIT, orderForm));

			return this;
		},

		// Event dispatcher
		_trigger: function(event, data) {
			$(window).trigger(event, data);
		},

		// Show error on console
		_error: function(type, data) {
			console.log(this.errors[type]);

			if(data) {
				console.log("Data:", data);
			}
		},

		_updateOrderForm: function(orderForm) {
			this.orderForm = orderForm;

			// Trigger event
			this._trigger(this.events.UPDATED, orderForm);
		},

		_vtexEvents: function() {
			$(window).on(this.events.VTEX_ORDER_FORM_UPDATED, (event, orderForm) => this._updateOrderForm(orderForm));
			$(window).on(this.events.VTEX_REQUEST_BEGIN, (event, data) => this._trigger(this.events.REQUEST_BEGIN, data));
			$(window).on(this.events.VTEX_REQUEST_END, (event, orderForm) => this._trigger(this.events.REQUEST_END, orderForm));
		},

		/**
		 * Gets the orderForm from VTEX API
		 * -fires trigger#REQUEST_BEGIN
		 * -fires trigger#REQUEST_END
		 * @return {Promise} Promise with the orderForm
		 */
		getOrderForm: function() {
			let xhr = checkout.getOrderForm();

			// Trigger loading event
			this._trigger(this.events.REQUEST_BEGIN);

			// Save ordeform
			xhr.done((orderForm) => {
				// Trigger loaded event
				this._trigger(this.events.REQUEST_END);
			});

			// Return promise
			return xhr;
		},

		/**
		 * Gets the orderFormId, must get an orderForm beforehand
		 * @return {String} orderForm ID
		 */
		getOrderFormId: function() {
			if(!this.orderForm)
				return this._error("undefinedOrderForm");

			return this.orderForm.orderFormId;
		},

		/**
		 * Gets the orderForm item Array
		 * @return {Array} Order Items Array
		 */
		getItems: function() {
			if(!this.orderForm)
				return this._error("undefinedOrderForm");

			return this.orderForm.items;
		},

		/**
		 * Removes an item from the order
		 * -fires trigger#UPDATE
		 * @param  {Number} index Index of the item to remove in the orderForm
		 * @return {Promise}      Promise with the updated orderForm
		 */
		removeItem: function(index) {
			let item = this.orderForm.items[index];
			item.index = index;

			let xhr = vtexjs.checkout.removeItems([item]);

			return xhr;
		},

		/**
		 * Removes an Array of items
		 * Fetch items objects from orderForm, push it into an array
		 * and send as a the 'itemArray' parameter
		 * -fires trigger#UPDATE
		 * @param  {Array<Object>} itemArray [description]
		 * @return {[type]}           [description]
		 */
		removeItemArray: function(itemArray) {
			if(!itemArray)
				return this._error("itemArrayNotDefined");

			if(!Array.isArray(itemArray))
				return this._error("itemArrayNotAnArray")

			let xhr = vtexjs.checkout.removeItems(itemArray);

			return xhr;
		},

		/**
		 * Update an item from the orderForm
		 * This method can be used to change the quantity of the item
		 * -fires trigger#UPDATE
		 * @param  {Number} index Index of the item
		 * @param  {Object} data  Object to extend the item
		 * @return {Promise}      Promise with the updated orderForm
		 */
		updateItem: function(index, data) {
			if(typeof index == "undefined")
				return this._error("indexNotDefined");

			if(!this.orderForm.items[index])
				return this._error("indexNotFound");

			if(!data)
				return this._error("dataNotDefined");

			let item = $.extend(this.orderForm.items[index], data);
			item["index"] = index;

			let xhr = vtexjs.checkout.updateItems([item]);

			return xhr;
		},
		
		/**
		 * Add atachment to item
		 * -fires trigger#UPDATE
		 *
		 * @param  {Number} index 	Index of the item
		 * @param  {String} name  	Name of attachment
		 * @param  {Object} content Content of attachment
		 * @return {Promise}      	Promise with the updated orderForm
		 */
		addItemAttachment: function(index, name, content) {
			if(typeof index == "undefined")
				return this._error("indexNotDefined");
			if(!this.orderForm.items[index])
				return this._error("indexNotFound");
			if(!name)
				return this._error("nameNotDefined");
			if(!content)
				return this._error("contentNotDefined");
			let xhr = vtexjs.checkout.addItemAttachment(index, name, content);
			return xhr;
		}
	};

	// Extend Fizzmod Class
	Fizzmod.OrderForm = OrderForm;

})(jQuery, Fizzmod, vtexjs.checkout, window);
