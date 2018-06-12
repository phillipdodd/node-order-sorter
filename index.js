const cheerio = require('cheerio')
const fs = require('fs')
 
const htmlFilePath = '../Print Invoice(s).html'
 
function readHtmlFile() {
  return new Promise(function(resolve){
    fs.readFile(htmlFilePath, 'utf8', function(err, data){
      if (err) {return console.log(err) }
      resolve(data)
    })
  })
}
 
function appendReportFile(reportObj) {
  try {
    fs.readFile('../report.csv', 'utf8', function(err, data){
      if (err) {
        console.log('report.csv not found, creating new one...')
        fs.writeFile('../report.csv', reportObj.headers + '\n' + reportObj.createLine(), function (err){
          if (err) return console.log(err)
          console.log('report.csv successfully updated (a).')
        })
      } else {
        fs.writeFile('../report.csv', data + '\n' + reportObj.createLine(), function (err){
          if (err) return console.log(err)
          console.log('report.csv successfully updated. (b)')
        })
      }
    })
  } catch (e) {
    console.log('writeResultsFile(): ' + e)
  }
}
 
function checkForSelectors(string) {
  var $ = cheerio.load(string)
  var proceed = true
 
 
  if(!$('#bin').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the id of "bin"')
  }
  if(!$('#date').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the id of "date"')
 
  }
  if(!$('#set').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the id of "set"')
  }
  if(!$('.order').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the class of "order"')
  }
  if(!$('.user font').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the class of "user"')
  }
  if(!$('.lineitems').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the class of "lineitems"')
  }
  if(!$('.lineitems .productrow').html()) {
    proceed = false
    console.log('Cannot locate HTML element with the class of "productrow"')
  }
 
  return proceed
 
}
 
function sortLineItems(orderElements){
  //TODO split this into multiple functions
  try {
 
    var sortedElements = orderElements.map(function(v){
      var $ = cheerio.load(v);
      var prodRows = [];
      var prodRowObjs = [];
      var prodRowsSorted = [];
 
      $('.lineitems .productrow').each(function(i, element){
        prodRows.push($(this).html());
      })
      prodRowObjs = prodRows.map(function(v){
        $ = cheerio.load(v)
 
        //TODO make this into a function
        if($('#set').html()) {
          var set = $('#set').html()
          var setNameOnly = '<td style="font-size: 8px;" class="lineitem" id="set">' + set.substr(12,set.length) + '</td>'
          $('#set').replaceWith($(setNameOnly))
        }
        if($('#foil').html()) {
          var foil = $('#foil').html()
          var foilValueOnly = '<td style="font-size: 8px; font-weight: bold;" class="lineitem" id="foil">' + foil.substr(12,foil.length) + '</td>'
          $('#foil').replaceWith($(foilValueOnly))
        }
 
        return {
          productRowElement: $.html(),
          bin: $('#bin').html()
        }
      })
 
      var prodRowsObjsSorted = alphaSort(prodRowObjs, 'bin')
 
      for (var x in prodRowsObjsSorted) {
        prodRowsSorted.push(prodRowsObjsSorted[x].productRowElement)
      }
 
 
      var wrappedProdRowElements = prodRowsSorted.map(function(v){
        return '<tr class="productrow" align="center" valign="center">' + v + '</tr>'
      })
 
 
      // console.log(wrappedProdRowElements.join(''))
 
      var wrappedProdRows = (function(){
        return '<table class="lineitems" border="0" frame="box" rules="all" width="670" cellpadding="2" cellspacing="0"><tbody><tr bgcolor="#cccccc" align="center"><td><b><u>Bin</u></b></td><td><b><u>Set</u></b></td><td witdth="100"><b><u>Foiling</u></b></td><td width="30"><b><u>Qty</u></b></td><td><b><u>Description</u></b></td><td width="auto"><b><u>SKU</u></b></td><td width="60"><b><u>Unit Cost</u></b></td><td width="60"><b><u>Amount</u></b></td></tr>' + wrappedProdRowElements.join('') + '</tbody></table>';
      })();
 
      $ = cheerio.load(v);
      $('.lineitems').replaceWith($(wrappedProdRows));
 
      return $.html()
 
 
 
    })
 
    return sortedElements;
  } catch (e) {
    console.log(e)
  }
}
 
function createOrderArray(string) {
  try {
    if (checkForSelectors(string)) {
      var $ = cheerio.load(string)
      var orders = []
      var orderElements = []
      var totalQuant = 0
      $('.order').each(function(i, element) {
        orderElements[i] = $(this).html()
      })
      orderElements = sortLineItems(orderElements)
      for (var x in orderElements) {
        $ = cheerio.load(orderElements[x])
        totalQuant = 0
        $('#quantity').each(function(i, element){
          totalQuant += +$(this).html()
        })
        orders.push({
          orderElement: orderElements[x],
          date: $('#date').first().html().substring(19,40),
          firstBin: $('#bin').first().html(),
          user: $('.user font').html(),
          total: $('#invoiceTotal').html(),
          totalQuant: totalQuant,
          isComboOrder: false
        })
      }
      return orders
    } else {
      console.log('Selectors missing')
    }
 
  } catch (e) {
    console.log('createOrderArray(): ' + e)
  }
}
 
function findDupUsers(orderArray) {
  try {
    var userList = []
    for (var order in orderArray) {
      userList.push(orderArray[order].user)
    }
 
    var dupUsers = []
    var mySet = new Set;
    userList.map(function(user){
      if(!mySet.has(user)){
        mySet.add(user)
      } else {
        dupUsers.push(user)
      }
 
    })
 
    return dupUsers
 
  } catch (e) {
    console.log('findDupUsers(): ' + e)
  }
}
 
function markIsComboOrder(dupUsers, ordersArray) {
  try {
    for (var x in ordersArray) {
      if(dupUsers.includes(ordersArray[x].user)) {
        ordersArray[x].isComboOrder = true
      }
    }
    return ordersArray
  } catch (e) {
    console.log('markIsComboOrder(): ' + e)
  }
}
 
function alphaSort(ordersArray, propName) {
  try {
    ordersArray.sort(function(a,b) {
      var a = a[propName]
      var b = b[propName]
      if (a < b) {
        return -1
      }
      if (a > b) {
        return 1
      }
      return 0
    })
    return ordersArray
  } catch (e) {
    console.log('alphaSort(): ' + e)
  }
 
}
 
function returnToHtmlString(orderArray, propName) {
  try {
    var sortedOrderArray = alphaSort(orderArray, propName)
    var array = []
    for (var order in sortedOrderArray) {
      array.push(sortedOrderArray[order].orderElement)
    }
    var wrappedArray = array.map(function(v){
      var wrappedString = '<DIV class="order"  style="page-break-after:always;page-break-inside:avoid">' + v + '</DIV>'
      return wrappedString
    })
    return wrappedArray.join('')
  } catch (e) {
    console.log('returnToHtmlString(): ' + e)
  }
}
 
function separateComboOrders(markedOrdersArray) {
 
  try {
    var comboOrders = []
    var singleOrders = []
 
    for (var x in markedOrdersArray) {
      if(markedOrdersArray[x].isComboOrder === true) {
        comboOrders.push(markedOrdersArray[x])
      } else {
        singleOrders.push(markedOrdersArray[x])
      }
    }
 
    return {
      comboOrders: returnToHtmlString(comboOrders, 'user'),
      singleOrders: returnToHtmlString(singleOrders, 'firstBin')
    }
  } catch (e) {
    console.log('separateComboOrders(): ' + e)
  }
 
}
 
function finalWrap(ordersObj) {
  try {
    const htmlHead = '<!doctype html><html><head><meta charset="utf-8" /><title>Print Invoice(s)</title><style type="text/css">body { font-family: Verdana; font-size: 10px; color: #333; background-color: #fff; }@media print { .no-print { display: none; } }</style><!--[if IE 7]><style type="text/css">#printBtn { width: 150px; }</style><![endif]--></head><body class="notranslate"><input type="button" value="Print" id="printBtn" onclick="window.print();return false;" class="no-print" style="position:fixed;top:20px;right:20px;" />'
    const resultsString = htmlHead + ordersObj.comboOrders + ordersObj.singleOrders + '</html>'
    return resultsString
  } catch (e) {
    console.log('finalWrap(): ' + e)
  }
}
 
function createReportNumbers(ordersArray) {
  try {
 
    const reportObj = {
      totalQuant: 0,
      invoiceTotals: 0,
      headers: 'Unique Emails,Invoice Total,Total Quantity,Shipping Estimate,Date',
      createLine: function(){
        return this.uniqueEmails.size + ',' + this.invoiceTotals.toFixed(2) + ',' + this.totalQuant + ',' + this.shippingEstimate + ',' + this.date
      },
      createCardListReport: function(){
        var stringOfMap
        for (var x of this.cardMap){
          stringOfMap += x.join() + '\n'
        }
        return 'Set,Quantity\n' + stringOfMap.replace('undefined','').replace('&apos;',"'")
      }
    }
    const listOfEmails = []
    const invoiceAmounts = []
 
    ordersArray.map(function(v){
      var $ = cheerio.load(v.orderElement)
      reportObj.date = v.date
      reportObj.totalQuant += +v.totalQuant
      listOfEmails.push(v.user)
      invoiceAmounts.push(v.total)
 
    })
 
    reportObj.uniqueEmails = new Set(listOfEmails)
    reportObj.shippingEstimate = calculateShippingEstimate(reportObj.uniqueEmails, ordersArray)
 
    reportObj.cardMap = calculateSetTotals(ordersArray)
 
    invoiceAmounts.map(function(v){
      return +v.replace('$','')
    }).map(function(v){
      reportObj.invoiceTotals += v
    })
 
    return reportObj
 
    // console.log('Unique Emails: ' + reportObj.uniqueEmails.size)
    // console.log('Invoice Total: ' + reportObj.invoiceTotals.toFixed(2))
    // console.log('Total Quantity: ' + reportObj.totalQuant)
    // console.log('Shipping Estimate: ' + reportObj.shippingEstimate)
 
  } catch (e) {
    console.log('createReportNumbers(): ' + e)
  }
}
 
function calculateShippingEstimate(uniqueEmailSet, ordersArray) {
 
  try {
    // cat 1: count < 15 && total < 20 -> .60
    // cat 2: count > 15 && total < 20 -> 1.35
    // cat 3: total > 20               -> 2.80
 
    const tempArray = []
    const tempObj = {
      totalShippingEstimate: 0
    }
 
    uniqueEmailSet.forEach(function(email){
      tempArray.push({
        user: email,
        totalQuant: 0,
        invoiceTotal: 0,
        estShippingCost: 0
      })
    })
 
    tempArray.map(function(v){
      for (var x in ordersArray) {
        if (v.user === ordersArray[x].user) {
          v.totalQuant += +ordersArray[x].totalQuant
          v.invoiceTotal += +(ordersArray[x].total.replace('$',''))
        }
      }
      return v
    }).map(function(v){
      if(v.invoiceTotal > 20 ) {
        v.estShippingCost = 2.8
      } else if (v.totalQuant > 15 && v.invoiceTotal < 20) {
        v.estShippingCost = 1.35
      } else if (v.totalQuant <= 15 && v.invoiceTotal < 20) {
        v.estShippingCost = .6
      }
      return v
    }).map(function(v){
      tempObj.totalShippingEstimate += v.estShippingCost
    })
 
    return tempObj.totalShippingEstimate.toFixed(2)
 
  } catch (e) {
    console.log('calculateShippingEstimate(): ' + e)
  }
 
}
 
function calculateSetTotals(ordersArray) {
  try {
 
    var cardMap = new Map()
    var $
 
    for (var x in ordersArray) {
      $ = cheerio.load(ordersArray[x].orderElement)
      $('.productrow').each(function(i,element){
        $ = cheerio.load($(this).html())
        var setName = $('#set').html()
        var cardQuant = $('#quantity').html()
        if(cardMap.get(setName)){
          var currentQuant = Number(cardMap.get(setName))
          cardMap.set(setName, currentQuant += +cardQuant)
        } else {
          cardMap.set(setName, cardQuant)
        }
      })
    }
 
    return cardMap
 
  } catch (e) {
    console.log('calculateSetTotals(): ' + e)
  }
}
 
//TODO combine write file functions
 
function writeCardListFile(reportObj) {
  try {
    var fileName = '../setlist '+ reportObj.date.replace('/','-').replace('/','-') +'.csv'
    fs.writeFile(fileName, reportObj.createCardListReport(), function (err){
      if (err) return console.log(err)
      console.log('setlist.csv created')
    })
  } catch (e) {
    console.log('writeCardListFile(): ' + e)
  }
}
 
function writeResultsFile(htmlString) {
  try {
    fs.writeFile('../sortedOrders.html', htmlString, function (err){
      if (err) return console.log(err)
      console.log('Print Invoice(s).hmtl successfully sorted as ./sortedOrders.html')
    })
  } catch (e) {
    console.log('writeResultsFile(): ' + e)
  }
}
 
readHtmlFile()
  .then(function(v){
    const ordersArray = createOrderArray(v)
    appendReportFile(createReportNumbers(ordersArray))
    writeCardListFile(createReportNumbers(ordersArray))
    const dupUsers = findDupUsers(ordersArray)
    const markedOrdersArray = markIsComboOrder(dupUsers, ordersArray)
    const separatedOrdersObject = separateComboOrders(markedOrdersArray)
    writeResultsFile(finalWrap(separatedOrdersObject))
  })