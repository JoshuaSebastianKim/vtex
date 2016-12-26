(function(MD) {
	const ERRORS = {
		"orderInfoNotDefined": "'orderInfo' is not defined, 'getOrderInfo()' must be called beforehand",
		"skuIdNotDefined": "'skuId' is not defined",
		"dataNotDefined": "'data' is not defined",
		"dataNotAnObject": "'data' is not a valid object"
	};

	const EVENTS = {
		"gotten": "Fizzmod.OrderInfo.Gotten"
	}

	/* CONSTRUCTOR
	---------------------------------------------------------------*/
	function OrderInfo() {
		// PROPERTIES
		this.orderInfoMDEntity = "OI";
		this.orderInfoFieldsArray = ["skuData", "substituteType"];
		this.orderInfo = {};
		this.orderFormId = null;
	};

	/* PRIVATE METHODS
	---------------------------------------------------------------*/
	OrderInfo.prototype._storeOrderInfo = function(orderInfo) {
		if(orderInfo) {
			// IF SKU DATA IS NULL SET IT AS AN EMPTY OBJECT
			if(orderInfo.skuData == null) {
				orderInfo.skuData = {};
			} else if(typeof orderInfo.skuData !== "object") {
				orderInfo.skuData = JSON.parse(orderInfo.skuData)
			}
		} else {
			orderInfo = {
				"skuData": {}
			};
		}

		return this.orderInfo = orderInfo;
	};

	OrderInfo.prototype._putOrderInfo = function(orderInfo = this.orderInfo) {
		// EMPTY DEFERRED OBJECT TO RETURN
		const xhr = $.Deferred();

		// PUT ORDER INFO
		const putOrderInfo = MD.insertUpdate(this.orderFormId, this.orderInfo, this.orderInfoMDEntity);

		// STORE ORDER INFO
		putOrderInfo.then(res => {
			// Store order info
			let orderInfo = this._storeOrderInfo(res.getResults());

			// Resolve the deferred object with the orderInfo
			xhr.resolve(orderInfo);
		});

		return xhr.promise();
	}

	/* PUBLIC METHODS
	---------------------------------------------------------------*/
	OrderInfo.prototype.getOrderInfo = function(orderFormId) {
		if(!orderFormId)
			return console.log("orderFormId is not defined");

		// STORE THE ORDER FORM ID
		this.orderFormId = orderFormId;

		// EMPTY DEFERRED OBJECT TO RETURN
		const xhr = $.Deferred();

		// GET ORDER INFO
		let getOrderInfo;

		if(this.getOrderInfoActiveRequest) {
			getOrderInfo = this.getOrderInfoActiveRequest;
		} else {
			// Store active request
			getOrderInfo = this.getOrderInfoActiveRequest = MD.get(orderFormId, this.orderInfoFieldsArray, this.orderInfoMDEntity);
		}

		// STORE ORDER INFO
		getOrderInfo.then(res => {
			// Store order info
			let orderInfo = this._storeOrderInfo(res.getResults());

			// Resolve the deferred object with the orderInfo
			xhr.resolve(orderInfo);

			// Clear active request
			this.getOrderInfoActiveRequest = undefined;
		});

		return xhr.promise();
	};

	OrderInfo.prototype.putNote = function(skuId, note) {
		if(!this.orderInfo)
			return console.log(ERRORS["orderInfoNotDefined"]);

		if(!skuId)
			return console.log(ERRORS["skuIdNotDefined"]);

		const skuData = this.orderInfo.skuData;
		const noteObject = {
			"note": note
		};

		// Check if sku is in skuData
		if(!(skuId in skuData)) {
			skuData[skuId] = {};
		}

		// Update skuData
		skuData[skuId] = Object.assign(skuData[skuId], noteObject);

		// Update orderInfo
		const putOrderInfo = this._putOrderInfo();

		return putOrderInfo;
	};

	OrderInfo.prototype.getNote = function(skuId) {
		if(!this.orderInfo)
			return console.log(ERRORS["orderInfoNotDefined"]);

		if(!skuId)
			return console.log(ERRORS["skuIdNotDefined"]);

		const skuData = this.orderInfo.skuData;
		const sku = skuData[skuId];

		// Check if sku is defined
		if(!sku)
			return false;

		const note = sku["note"];

		// Check if note in sku is defined
		if(note) {
			return note;
		}
		else {
			return false;
		}
	}

	OrderInfo.prototype.putSkuItemData = function(skuId, data) {
		if(!this.orderInfo)
			return console.log(ERRORS["orderInfoNotDefined"]);

		if(!skuId)
			return console.log(ERRORS["skuIdNotDefined"]);

		if(!data)
			return console.log(ERRORS["dataIdNotDefined"]);

		if(typeof data !== "object")
			return console.log(ERROR["dataNotAnObject"]);

		let { skuData } = this.orderInfo;

		if(!(skuId in skuData)) {
			skuData[skuId] = {}
		}

		// Update skuData
		skuData[skuId] = Object.assign(skuData[skuId], data);

		// Update orderInfo
		const putOrderInfo = this._putOrderInfo();

		return putOrderInfo;
	}

	// Inject into the window scope
	window.OrderInfo = OrderInfo;
})(Fizzmod.MasterData);
