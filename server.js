
/**
* Module dependencies.
*/

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , bodyParser = require('body-parser')
  , fs = require('fs');

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(bodyParser.json());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

app.get('/', function (req, res) {
    res.render('index', { title: 'Express', MyCarts: MyCarts });
});

app.get('/users', user.list);

// Cart Management
app.post("/carts", postCart);
app.get("/carts/:cartId", getCart);
app.get("/cartItems/:cartId", getCartItems);
app.post("/carts/:cartId/items", addItemToCart);
app.del("/carts/:cartId/items/:itemId", deleteItemFromCart);
app.post("/carts/:cartId/items/:itemId/comments", addCommentToItem);
app.post("/search", searchByTerm);
app.post("/carts/:cartId/items/:itemId/rate", rateItem);

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});

function postCart(req, res) {
    MyCarts.push(makeNewCart(req.body.name));
    res.status(201).send();
}

function getCartItems(req, res) {
    var cartId = req.params.cartId;
    var cart = findCartById(cartId);
    if (cart) {
        res.status(200).send(JSON.stringify(cart));
    } else {
        res.status(500).send("No cart with id " + cartId + " found.");
    }
}

function getCart(req, res) {
    var cartId = req.params.cartId;
    var cart = findCartById(cartId);
    if (cart) {
        res.render('cart', { title: 'Shopping Buddies', cart: cart });
    } else {
        res.status(500).send("No cart with id " + cartId + " found.");
    }
}

function addItemToCart(req, res) {
    var cartId = req.params.cartId;
    var cart = findCartById(cartId);
    if (!cart) {
        res.send("No cart with id " + cartId + " found.");
        return;
    }

    if (req.body.url) {
        var item = makeNewItem(req.body.url);
        cart.items.push(item);
        scrapeProductName(item, function () {
            saveToJson();
            res.status(201).send();
        });
    } else if (req.body.id) {
        var item = makeNewItem("");
        cart.items.push(item);
        getProductDetails(req.body.id, item, function () {
            saveToJson();
            res.status(201).send();
        });
    }
}

function addCommentToItem(req, res) {
    var cartId = req.params.cartId;
    var itemId = req.params.itemId;

    var cart = findCartById(cartId);
    if (!cart) {
        res.send("No cart with id " + cartId + " found.");
        return;
    }

    var item = findItemFromCart(cart, itemId);
    if (!item) {
        res.send("No cart with id " + itemId + " found.");
        return;
    }

    item.comments.push({ name: req.body.name, message: req.body.message });

    saveToJson();

    res.status(200).send();
}

function rateItem(req, res) {
    var cartId = req.params.cartId;
    var itemId = req.params.itemId;

    var cart = findCartById(cartId);
    if (!cart) {
        res.send("No cart with id " + cartId + " found.");
        return;
    }

    var item = findItemFromCart(cart, itemId);
    if (!item) {
        res.send("No cart with id " + itemId + " found.");
        return;
    }

    var ratingName = req.body.rating;
    var found = false;
    for (var i = 0; i < item.ratings.length; i++) {
        if (item.ratings[i].name == ratingName) {
            item.ratings[i].count++;
            found = true;
        }
    }

    if (!found) {
        item.ratings.push({ name: ratingName, count: 1 });
    }

    res.status(200).send();
}

function deleteItemFromCart(req, res) {
    var cartId = req.params.cartId;
    var itemId = req.params.itemId;
    var cart = findCartById(cartId);
    if (!cart) {
        res.send("No cart with id " + cartId + " found.");
        return;
    }

    var item = findItemFromCart(cart, itemId);
    if (!item) {
        res.send("No cart with id " + itemId + " found.");
        return;
    }

    var index = cart.items.indexOf(item);
    cart.items.splice(index, 1);
    saveToJson();
    res.status(201).send();
}

function makeNewCart(name) {
    return { name: name, id: nextId(), items: [] };
}

function makeNewItem(url) {
    var item = { id: nextId(),
        ratings:
    [{ name: "Love it", count: 0 },
    { name: "Hate it", count: 0 },
    { name: "Maybe?", count: 0}],
        comments: [],
        url: url,
        img: "/images/placeholder.png",
        name: "Uninitialized item",
        chatLog: []
    };
    return item;
}

function addChatMessage(cart, name, message) {
    cart.chatlog.push({ name: name, message: message, timestamp: Date.now() });
}

var idCount = 0;
function nextId() {
    idCount = idCount + 1;
    return "id_" + idCount;
}

function findItemFromCart(cart, id) {
    for (var i = 0; i < cart.items.length; i++) {
        if (cart.items[i].id == id) {
            return cart.items[i];
        }
    }

    return null;
}

function findCartById(id) {
    for (var i = 0; i < MyCarts.length; i++) {
        if (MyCarts[i].id == id) {
            return MyCarts[i];
        }
    }

    return null;
}

function scrapeProductName(item, callback) {
    var pUrl = require('url').parse(item.url);
    var productId = pUrl.pathname.substr(pUrl.pathname.lastIndexOf("p-") + 2);

    console.log("Looking for item: '" + productId + "'");

    getProductDetails(productId, item, function () {
        callback();
    });
}

function getProductDetails(id, item, callback) {
    GET("http://api.developer.sears.com/v2.1/products/details/sears/json/" + id + "?apikey=pLZJ1YdF0gJQYa4w5QmqRrPb7DWWi9Rx", function (json) {
        console.log("Got the response from SEARS: " + json);
        var obj = JSON.parse(json);
        try {
            item.img = obj.ProductDetail.SoftHardProductDetails.Description.Images.MainImageUrl;
            item.name = obj.ProductDetail.SoftHardProductDetails.Description.DescriptionName;
            item.price = obj.ProductDetail.SoftHardProductDetails.Price.SalePrice || obj.ProductDetail.SoftHardProductDetails.Price.RegularPrice || obj.ProductDetail.SoftHardProductDetails.Price.DisplayPrice;
        } catch (ex) {

        }
        callback();
    });
}

function searchByTerm(req, res) {
    var query = req.body.query;
    try {
        searchTermAtSears(query, function (products) {
            res.status(200).send(JSON.stringify(products));
        });
    } catch (ex) {
        res.status(500).send()
    }
}

function searchTermAtSears(keyword, callback) {
    GET("http://api.developer.sears.com/v2.1/products/search/Sears/json/keyword/" + keyword + "?apikey=pLZJ1YdF0gJQYa4w5QmqRrPb7DWWi9Rx", function (json) {
        console.log("Got the response from SEARS: " + json);
        var obj = JSON.parse(json);

        var products = obj.SearchResults.Products;
        var items = products.map(function (item) {
            return { name: item.Description.Name, img: item.Description.ImageURL, price: item.Price.DisplayPrice, id: item.Id.PartNumber };
        });

        callback(items);
    });
}

function GET(url, callback) {
    http.get(url, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            callback(body);
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
    });
}

var MyCarts = [makeNewCart("My First Cart"), makeNewCart("For Friends")];

function saveToJson() {
    var json = JSON.stringify({ MyCarts: MyCarts, idCount: idCount });
    fs = require('fs');
    fs.writeFile("storage/carts.json", json);
}

function loadFromJson() {
    fs.readFile('storage/carts.json', 'utf8', function (err, data) {
        if (err) {
            return console.log(err);
        }

        var obj = JSON.parse(data);
        MyCarts = obj.MyCarts;
        idCount = obj.idCount;
    });

}

loadFromJson();