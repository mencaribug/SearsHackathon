function addCart() {
    var cartName = prompt("Input a name for the cart");
    if (cartName) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/carts", true);
        xhr.onload = function () {
            window.location.reload();
        };

        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ name: cartName }));
    }
}

function addItem(cartId, url) {
    if (url.length > 20 && url.indexOf("/p-") > 0) {
        document.getElementById("urlInput").disabled = true;

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/carts/" + cartId + "/items", true);
        xhr.onload = function () {
            document.getElementById("urlInput").value = "";
            delete document.getElementById("urlInput").disabled;
            window.location.reload();
        };

        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ url: url }));
    }
}

function deleteItem(cartId, itemId)
{
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", "/carts/" + cartId + "/items/" + itemId, true);
    xhr.onload = function () {
        setTimeout(function () {
            window.location.reload();
        }, 100);

    };

    xhr.send();
}

function submitComment(cartId, itemId) {
    var text = document.getElementById("input_" + itemId).value;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/carts/" + cartId + "/items/" + itemId + "/comments", true);
    xhr.onload = function () {
        window.location.reload();
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({name: "anonymous", message: text}));
}

function rateItem(cartId, itemId, ratingName) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/carts/" + cartId + "/items/" + itemId + "/rate", true);
    xhr.onload = function () {
        window.location.reload(); // TODO: Reloading the page here isn't ideal
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({name: "anonymous", rating: ratingName}));
}

function doSearch(e) {
    var text = e.target.value;
    if (text.length < 2) {
        return;
    }

    if (text.indexOf("http") == 0) {
        addItem(window.theCartId, text);
        return;
    }

    if (timeoutId) { // debounce
        window.clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(function () {
        runSearch(text);
    }, 250)
}
var timeoutId = 0;

function runSearch(text) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/search", true);
    xhr.onload = function () {
        var items = JSON.parse(xhr.responseText); // items are {name, img, price}
        var container = document.getElementById("searchResults");
        container.innerText = "";
        for (var i = 0; i < items.length; i++) {
            var it = document.createElement("div");

            var im = document.createElement("img");
            im.src = items[i].img;
            it.appendChild(im);

            var title = document.createElement("span");
            title.innerText = items[i].name;
            it.appendChild(title);

            var price = document.createElement("span");
            price.innerText = items[i].price;
            price.className = "priceDiv";
            it.appendChild(price);

            container.appendChild(it);
        }
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({query: text}));
}