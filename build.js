const fs = require("fs"); //source medium
const path = require("path");
var Seen = new Set()    // var for clone
var Duplicates = 0      // count the clone found

const files = fs.readdirSync("data").filter(f => f.endsWith(".csv"));
console.log(files.length + " fichiers trouvés");

var Json = [] // one json for all

for (var k = 0; k < files.length; k++) { // file one by one
  var Document = fs.readFileSync(path.join("data", files[k])).toString().split(/\r?\n/).filter(l => l.trim() !== "")
  var Columns = Document[0] //contains first line and first word

  Document.shift() //clear the header line from the data
  Columns = Columns.split(',')

  for (var i = 0; i < Document.length; i++) { //will place the element into the json file
    var Data = {}
    var Element = Document[i].split(',')
	for (var j = 0; j < Element.length; j++) {
      Data[Columns[j]] = Element[j]
    }

    // number convert
    Data.price = Number(Data.price)
    if (Data.data_gb === "") { // empty = unlimited offer, so we use null (not 0)
      Data.data_gb = null
    } else {
      Data.data_gb = Number(Data.data_gb)
    }

	var Key = Data.provider + "|" + Data.country_code + "|" + Data.data_gb + "|" + Data.validity_days + "|" + Data.price
    if (Seen.has(Key)) {
      Duplicates++
      continue
    }
    Seen.add(Key)

    Json.push(Data)
  }
  console.log(files[k] + " : " + Document.length + " produits")
}

console.log("TOTAL : " + Json.length + " produits")
console.log("Doublons supprimés : " + Duplicates)

// stats

var Total = Json.length          // totsl of cards number
var Over100 = 0                  // product over 100
var MinPrice = Json[0].price     // min price nad max
var MaxPrice = Json[0].price
var SumPrice = 0                 // price average
var SumData = 0                  // data average
var CountData = 0                // number of card with data
var BySupplier = {}              // number of card by supplier

for (var n = 0; n < Json.length; n++) {
  var Card = Json[n]

  if (Card.price > 100) Over100++
  if (Card.price < MinPrice) MinPrice = Card.price
  if (Card.price > MaxPrice) MaxPrice = Card.price
  SumPrice += Card.price

  if (Card.data_gb !== null) { //ignore unlimited
    SumData += Card.data_gb
    CountData++
  }

  BySupplier[Card.provider] = (BySupplier[Card.provider] || 0) + 1
}

var AvgPrice = SumPrice / Total
var AvgData = SumData / CountData

console.log("1. Total :", Total)
console.log("2. > 100 € :", Over100)
console.log("3. Prix min / max :", MinPrice, "/", MaxPrice)
console.log("4. Data moyenne :", AvgData.toFixed(2), "Go (sur", CountData, "cartes)")
console.log("5. Prix moyen :", AvgPrice.toFixed(2), "€")
console.log("6. Par fournisseur :", BySupplier)

// for stats json

// object to tab sorted
var Suppliers = []
for (var name in BySupplier) {
  Suppliers.push({ name: name, count: BySupplier[name] })
}
Suppliers.sort(function (a, b) { return b.count - a.count })

// price distribution: 5 buckets
var Buckets = [
  { label: "< 10", count: 0 },
  { label: "10-25", count: 0 },
  { label: "25-50", count: 0 },
  { label: "50-100", count: 0 },
  { label: "> 100", count: 0 }
]
var Unlimited = 0
var InvalidPrices = 0
for (var m = 0; m < Json.length; m++) {
  var P = Json[m].price
  if (isNaN(P) || P <= 0) InvalidPrices++
  if (P < 10) Buckets[0].count++
  else if (P < 25) Buckets[1].count++
  else if (P < 50) Buckets[2].count++
  else if (P <= 100) Buckets[3].count++
  else Buckets[4].count++

  if (Json[m].data_gb === null) Unlimited++
}

// top 5 expensive producs
var Sorted = Json.slice().sort(function (a, b) { return b.price - a.price })
var Top = []
for (var t = 0; t < 5; t++) {
  Top.push({ name: Sorted[t].product_name, provider: Sorted[t].provider, price: Sorted[t].price })
}

// products for the dashboard table (fields are renamed)
var Products = []
for (var q = 0; q < Json.length; q++) {
  Products.push({
    name: Json[q].product_name,
    provider: Json[q].provider,
    country: Json[q].country_name,
    dataGb: Json[q].data_gb,
    days: Number(Json[q].validity_days),
    price: Json[q].price,
    currency: Json[q].currency
  })
}

var Stats = {
  updatedAt: new Date().toLocaleString("fr-FR"),
  filesRead: files.length,
  stats: {
    total: Total,
    over100: Over100,
    minPrice: MinPrice,
    maxPrice: MaxPrice,
    avgPrice: Math.round(AvgPrice * 100) / 100,
    avgData: Math.round(AvgData * 100) / 100
  },
  suppliers: Suppliers,
  priceBuckets: Buckets,
  topProducts: Top,
  quality: {
    total: Total,
    unlimited: Unlimited,
    invalidPrices: InvalidPrices,
    duplicates: Duplicates
  },
  products: Products
}

fs.writeFileSync("stats.json", JSON.stringify(Stats, null, 2))
console.log("stats.json écrit")