function addCart() {
    var cartName = prompt("Input a name for the cart");
    if (cartName) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/carts", true);
        xhr.onload = function () {
            var createdCartId = xhr.getResponseHeader("cartId");
            var creatorSecret = xhr.getResponseHeader("creatorSecret");
            addCreatorSecret(createdCartId, creatorSecret);
            addKnownCartId(createdCartId);
            clientRenderCarts();
        };

        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ name: cartName }));
    }
}

function addItem(cartId, url) {
    if (url.length > 20 && url.indexOf("/p-") > 0) {
        var pUrl = urlParse(url);
        var productId = pUrl.substr(pUrl.lastIndexOf("p-") + 2);
        document.getElementById("urlInput").disabled = true;

        addItemInternal(productId);
    }
}

function urlParse(url) {
    if (url.indexOf("?") >= 0) {
        return url.substring(0, url.indexOf("?"));
    }

    return url;
}

function addItemInternal(id) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/carts/" + theCartId + "/items", true);
    xhr.onload = function () {
        document.getElementById("urlInput").value = "";
        document.getElementById("urlInput").disabled = false;
        clientRenderCartItems();
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ id: id }));
}

function deleteItem(cartId, itemId) {
    var xhr = new XMLHttpRequest();
    xhr.open("DELETE", "/carts/" + cartId + "/items/" + itemId, true);
    xhr.onload = function () {
        clientRenderCartItems();
    };

    xhr.send();
}

function submitComment(cartId, itemId) {
    var text = document.getElementById("input_" + itemId).value;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/carts/" + cartId + "/items/" + itemId + "/comments", true);
    xhr.onload = function () {
        clientRenderCartItems();
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ name: "anonymous", message: text }));
}

function rateItem(cartId, itemId, ratingName) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/carts/" + cartId + "/items/" + itemId + "/rate", true);
    xhr.onload = function () {
        clientRenderCartItems();
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ name: "anonymous", rating: ratingName }));
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

            var addButton = document.createElement("button");
            addButton.innerText = "add";
            addButton.className = "addButton";
            addButton.onclick = function (item) {
                addItemInternal(item.id)
            } .bind(this, items[i]);
            it.appendChild(addButton);

            container.appendChild(it);
        }
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ query: text }));
}

function getCartItems(cartId, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/cartItems/" + cartId, true);
    xhr.onload = function () {
        callback(JSON.parse(this.responseText).items);
    };

    xhr.send();
}


function getCartList(callback) {
    var ids = getKnownCartIds();

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/cartList", true);
    xhr.onload = function () {
        callback(JSON.parse(this.responseText).carts);
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({ ids: ids }));
}

function clientRenderCarts() {
    getCartList(function (carts) {
        var container = document.getElementById("itemsList");
        container.textContent = "";
        for (var i = 0; i < carts.length; i++) {
            var itemDiv = renderCartLink(carts[i]);
            container.appendChild(itemDiv);
        }

        if (carts.length == 0) {
            container.appendChild(document.createTextNode("You don't have any carts! Create a new one..."));
        }
    });
}

function make(type, contents, className) {
    var d = document.createElement(type);
    if (contents) {
        d.innerText = contents;
    }

    if (className) {
        d.className = className;
    }
    return d;
}

function img(src) {
    var im = document.createElement("img");
    im.src = src;
    return im;
}

function clientRenderCartItems() {
    getCartItems(theCartId, function (items) {
        var container = document.getElementById("actualItemList");
        container.textContent = "";
        for (var i = 0; i < items.length; i++) {
            var itemDiv = renderCartItem(items[i]);
            container.appendChild(itemDiv);
        }

        if (items.length == 0) {
            container.appendChild(document.createTextNode("You don't have any items! Add some to your cart..."));
        }
    });
}

function renderCartLink(cart) {
    var root = make("div", "", "cartLink");
    var cartLink = make("div", "", "cartLink");
    var im = img("/images/cart.png");
    im.className = "cartImg";
    cartLink.appendChild(im);
    var a = make("a", cart.name, "");
    a.href = '/carts/' + cart.id;
    cartLink.appendChild(a);
    root.appendChild(cartLink);
    return root;
}

function renderCartItem(item) {
    var root = make("div", "", "item");
    root.appendChild(img(item.img));
    root.appendChild(make("span", item.name, "name"))
    root.appendChild(make("span", item.price, "priceDiv"));
    var bs = make("div", "", "bottomSection");
    var cs = make("div", "", "commentSection");
    for (var i = 0; i < item.comments.length; i++) {
        cs.appendChild(make("span", item.comments[i].name + ": " + item.comments[i].message, ""));
        cs.appendChild(make("br", "", ""));
    }
    var commentInput = make("input", "", "");
    commentInput.id = "input_" + item.id;
    commentInput.placeholder = "comment...";
    cs.appendChild(commentInput);
    var commentButton = make("button", "Send");
    commentButton.onclick = function () {
        submitComment(theCartId, item.id);
    };
    cs.appendChild(commentButton);
    bs.appendChild(cs);

    var rs = make("div", "", "ratingSection");
    for (var i = 0; i < item.ratings.length; i++) {
        var rating = item.ratings[i];
        var rd = make("div", "", "ratingDiv");
        var ratingButton = make("button", rating.name, "");
        ratingButton.onclick = rateItem.bind(this, theCartId, item.id, rating.name);
        rd.appendChild(ratingButton);
        if (!rating.count) {
            rating.count = "0"
        }
        rd.appendChild(make("span", rating.count, "ratingCount"));
        rs.appendChild(rd);
    }
    bs.appendChild(rs);
    root.appendChild(bs);

    var delButton = make("button", "Del", "delButton");
    delButton.onclick = function () {
        deleteItem(theCartId, item.id);
    }
    root.appendChild(delButton);

    return root;
    /*

    div.ratingSection
    for rating in item.ratings
    div.ratingDiv
    button(onclick="rateItem('" + cart.id + "', '" + item.id + "', '" + rating.name + "')")= rating.name
    span.ratingCount= rating.count
    button(onclick="deleteItem('" + cart.id + "', '" + item.id + "')") Del


    div.item
    img(src=item.img)
    span.name= item.name
    span.priceDiv= item.price
    div
    a(href=item.url)= Link
    div.bottomSection
    div.commentSection
    for comment in item.comments
    span #{comment.name}: #{comment.message}
    br
    br
    input(id="input_" + item.id placeholder="comment...") 
    button(onclick="submitComment('" + cart.id + "', '" + item.id + "')") Send
    div.ratingSection
    for rating in item.ratings
    div.ratingDiv
    button(onclick="rateItem('" + cart.id + "', '" + item.id + "', '" + rating.name + "')")= rating.name
    span.ratingCount= rating.count
    button(onclick="deleteItem('" + cart.id + "', '" + item.id + "')") Del
    */
}


function addCreatorSecret(cartId, key) {
    var secretString = window.localStorage.getItem("creatorSecrets");
    if (secretString) {
        var secrets = JSON.parse(secretString);

    } else {
        var secrets = [];
    }

    secrets.push({ cartId: cartId, key: key });

    window.localStorage.setItem("creatorSecrets", JSON.stringify(secrets));
}

function getCreatorSecret(cartId) {
    var secretString = window.localStorage.getItem("creatorSecrets");
    if (secretString) {
        var secrets = JSON.parse(secretString);
        for (var i = 0; i < secrets.length; i++) {
            if (secrets[i].cartId == cartId) {
                return secrets[i].key;
            }
        }
    }

    return null;
}

function getKnownCartIds() {
    var cartIdsString = window.localStorage.getItem("knownCartIds");
    if (cartIdsString) {
        var cartIds = JSON.parse(cartIdsString);
        return cartIds;
    }

    return [];
}

function addKnownCartId(cartId) {
    var cartIdsString = window.localStorage.getItem("knownCartIds");
    if (cartIdsString) {
        var cartIds = JSON.parse(cartIdsString);
    } else {
        var cartIds = [];
    }

    if (cartIds.indexOf(cartId) == -1) {
        cartIds.push(cartId);
    }

    window.localStorage.setItem("knownCartIds", JSON.stringify(cartIds));
}