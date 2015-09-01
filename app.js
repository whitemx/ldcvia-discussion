$(document).ready(function(){
  $('[data-toggle="tooltip"]').tooltip({delay: { "show": 0, "hide": 300 }});
  $('[data-toggle="offcanvas"]').click(function () {
    $('.row-offcanvas').toggleClass('active')
  });
  if (model.apikey() == null){
    initAnonymous();
  }else{
    initAuthenticated();
  }

  $(window).on('popstate', function() {
    model.home();
  });

});

function initAnonymous(){
  if (Cookies.get('apikey')){
    model.apikey(Cookies.get('apikey'));
    model.useremail(Cookies.get('useremail'));
    initAuthenticated();
  }
}

function initAuthenticated(){
  $.ajax({
    method: 'GET',
    url: model.hostname + "/database/" + model.dbname,
    headers: {"apikey": model.apikey()}
  })
  .done(function(data){
    model.dbtitle(data.title);
    model.indexed(data.indexed);
  });
  $.ajax({
    method: 'GET',
    url: model.hostname + "/list/" + model.dbname + "/MainTopic/Categories",
    headers: {"apikey": model.apikey()}
  })
  .done(function(data){
    model.categorieslist(data);
  })
  if (gup("unid") == ""){
    getViewData();
  }else{
    $.ajax({
      method: 'GET',
      url: model.hostname + "/document/" + model.dbname + "/MainTopic/" + gup("unid"),
      headers: {"apikey": model.apikey()}
    })
    .done(function(data){
      model.openDocument(data);
    })
  }
}

function AppViewModel() {
  this.hostname = "https://eu.ldcvia.com/1.0";
  this.dbname = gup('db');
  this.apikey = ko.observable(null);//'3244d4d78226ef748f0395c6eddc3bbc';
  this.useremail = ko.observable(null);
  this.viewentries = ko.observableArray(null);
  this.max = ko.observable(0);
  this.start = ko.observable(0);
  this.count = 10
  this.pages = ko.observableArray(null);
  this.dbtitle = ko.observable("Please login");
  this.indexed = ko.observable(true);
  this.error = ko.observable(null);
  this.search = ko.observable(null);
  this.newdocument = ko.observable(false);

  this.home = function(){
    model.Subject(null);
    model.__unid(null);
    model.newdocument(false);
    window.history.pushState(null, null, window.location.origin + window.location.pathname + "?db=" + model.dbname);
    getViewData();
  }

  //Login Fields
  this.username = ko.observable(null);
  this.password = ko.observable(null);
  this.remember = ko.observable(true);

  this.login = function(){
    $.ajax({
      method: "POST",
      url: this.hostname + "/login",
      data: "username=" + model.username() + "&password=" + model.password()
    })
    .done(function(data){
      if (data.apikey){
        model.apikey(data.apikey);
        model.useremail(data.email);
        if (model.remember()){
          Cookies.set('apikey', data.apikey, { expires: 28 });
          Cookies.set('useremail', data.email, { expires: 28 });
        }
        initAuthenticated();
      }else{
        model.error(data.error);
      }
    })
  }

  this.logout = function(){
    model.apikey(null);
    model.useremail(null);
    model.viewentries.removeAll();
    model.pages.removeAll();
    Cookies.remove('apikey');
    Cookies.remove('useremail');
  }

  //MainTopic Fields
  this.Subject = ko.observable(null);
  this.From = ko.observable(null);
  this.Categories = ko.observable(null);
  this.__created = ko.observable(null);
  this.Body = ko.observable(null);
  this.Body__parsed = ko.observable(null);
  this.__unid = ko.observable(null);
  this.responses = ko.observableArray(null);
  this._files = ko.observableArray(null);
  this.categorieslist = ko.observableArray(null);
  this.permalink = ko.observable(null);

  //Response Fields
  this.ResponseSubject = ko.observable(null);
  this.ResponseBody__parsed = ko.observable(null);

  this.openDocument = function(data){
    model.Subject(data.Subject);
    model.From(data.From);
    model.Categories(data.Categories);
    model.__created(data.__created);
    model.Body(data.Body);
    model.Body__parsed(data.Body__parsed);
    model.__unid(data.__unid);
    model.permalink(data.permalink);
    window.history.pushState(null, null, data.permalink);
    $.ajax({
      method: 'GET',
      url: model.hostname + "/responses/" + model.dbname + "/MainTopic/" + this.__unid + "?expand=true",
      headers: {"apikey": model.apikey()}
    })
    .done(function(data){
      model.responses.removeAll();
      var responses = data.data;
      for (var i=0; i<responses.length; i++){
        responses[i].From = formatNotesName(responses[i].From);
        responses[i].__created = moment(responses[i].__created).format('MMMM Do YYYY, h:mm:ss a');
        model.responses.push(responses[i]);
      }
    })
    model._files(data._files);
  }

  this.updateDocument = function(data){
    model._files.removeAll();
    ko.mapping.fromJS(data, {}, this);
  };

  this.getFirstViewPage = function(){
    this.start(0);
    if (model.search() == null || model.search() == ""){
      getViewData();
    }else{
      getSearchData();
    }
  }

  this.getLastViewPage = function(){
    this.start(this.max - (this.max % this.count));
    if (model.search() == null || model.search() == ""){
      getViewData();
    }else{
      getSearchData();
    }
  }

  this.doSearch = function(){
    if (model.search() == null || model.search() == ""){
      getViewData();
    }else{
      getSearchData(new PageNum(1, 0));
    }
  }

  this.resetSearch = function(){
    model.search(null);
    getViewData(new PageNum(1, 0));
  }

  this.openFile = function(data){
    window.open(model.hostname + "/attachment/" + model.dbname + "/MainTopic/" + model.__unid() + "/" + data + "?apikey=" + model.apikey());
  }

  this.newDocument = function(){
    model.Subject(null);
    model.Categories(null);
    model.Body__parsed(null);
    model.newdocument(true);
  }

  this.cancelNewDocument = function(){
    model.newdocument(false);
  }

  this.saveNewDocument = function(){
    var data = {};
    var unid = new Date().getTime();
    data.__unid = unid;
    data.FormName = "MainTopic";
    data.__form = "MainTopic";
    data.Categories = model.Categories();
    data.From = model.useremail();
    data.AbbreviateFrom = model.useremail();
    data.Body = {
      "type": "multipart",
      "content": [{
        "contentType": "text/html; charset=UTF-8",
        "data": model.Body__parsed()
      }]
    };
    data.Subject = model.Subject();
    data.__created = new Date().toISOString();
    data.__modified = new Date().toISOString();
    var fileInput = $("#fileupload");
    var file = fileInput[0].files[0];
    var reader = new FileReader();
    if (file) {
      //Convert the file attachment to BASE64 string
      reader.onload = function(e) {
        data.Body.content.push({
          "contentType": file.type + "; name=\"" + file.name + "\"",
          "contentDisposition": "attachment; filename=\"" + file.name + "\"",
          "contentTransferEncoding": "base64",
          "data": reader.result.match(/,(.*)$/)[1]
        });
        sendNewDocument(data, function (){
          model.home();
        });
      }
      reader.readAsDataURL(file);
    } else {
      sendNewDocument(data, function(){
        model.home();
      });
    }
  }

  this.saveNewResponse = function(){
    var data = {};
    var unid = new Date().getTime();
    data.__unid = unid;
    data.__parentid = model.__unid();
    data.FormName = "Response";
    data.__form = "Response";
    data.From = model.useremail();
    data.AbbreviateFrom = model.useremail();
    data.Body = {
      "type": "multipart",
      "content": [{
        "contentType": "text/html; charset=UTF-8",
        "data": model.ResponseBody__parsed()
      }]
    };
    data.Subject = model.ResponseSubject();
    data.__created = new Date().toISOString();
    data.__modified = new Date().toISOString();
    var fileInput = $("#responsefileupload");
    var file = fileInput[0].files[0];
    var reader = new FileReader();
    if (file) {
      //Convert the file attachment to BASE64 string
      reader.onload = function(e) {
        data.Body.content.push({
          "contentType": file.type + "; name=\"" + file.name + "\"",
          "contentDisposition": "attachment; filename=\"" + file.name + "\"",
          "contentTransferEncoding": "base64",
          "data": reader.result.match(/,(.*)$/)[1]
        });
        sendNewDocument(data, loadResponses);
      }
      reader.readAsDataURL(file);
    } else {
      sendNewDocument(data, loadResponses);
    }

  }

  this.copyPermalink = function(){
    var copyEvent = new ClipboardEvent('copy', { dataType: 'text/plain', data: model.permalink() } );
    document.dispatchEvent(copyEvent);
  }

}

var sendNewDocument = function(data, callback) {
  $.ajax({
    dataType: 'json',
    type: 'PUT',
    headers: {
      'apikey': model.apikey()
    },
    data: data,
    url: model.hostname + '/document/' + model.dbname + "/" + data.FormName + "/" + data.__unid,
    complete: function(res) {
      callback();
    }
  });

}

function loadResponses(){
  model.ResponseSubject(null);
  model.ResponseBody__parsed(null);
  $.ajax({
    method: 'GET',
    url: model.hostname + "/responses/" + model.dbname + "/MainTopic/" + model.__unid() + "?expand=true",
    headers: {"apikey": model.apikey()}
  })
  .done(function(data){
    model.responses.removeAll();
    var responses = data.data;
    for (var i=0; i<responses.length; i++){
      responses[i].From = formatNotesName(responses[i].From);
      responses[i].__created = moment(responses[i].__created).format('MMMM Do YYYY, h:mm:ss a');
      model.responses.push(responses[i]);
    }
  })
}

var model = new AppViewModel();
ko.applyBindings(model);

function PageNum(pagenum, start){
  this.pagenum = pagenum;
  this.start = start;
  this.getViewPage = function(data){
    if (model.search() == null || model.search() == ""){
      getViewData(this);
    }else{
      getSearchData(this);
    }
  }
}

function getViewData(data){
  if (data){
    model.start(data.start);
  }
  $.ajax({
    method: "GET",
    url: model.hostname + "/collections/" + model.dbname + "/MainTopic?count=" + model.count +  "&start=" + model.start(),
    headers: {"apikey": model.apikey()}
  })
  .done(function(data) {
    model.max = data.count;
    model.viewentries.removeAll();
    model.pages.removeAll();
    var pagenum = 1;
    for (var i=0; i<model.max; i = i + model.count){
      model.pages.push(new PageNum(pagenum, (pagenum - 1) * model.count));
      pagenum++;
    }
    for (var i=0; i<data.data.length; i++){
      data.data[i].From = formatNotesName(data.data[i].From);
      data.data[i].__created = moment(data.data[i].__created).format('DD-MMM-YY');
      var newurl = window.location.origin + window.location.pathname + "?db=" + model.dbname + "&unid=" + data.data[i].__unid;
      data.data[i].permalink = newurl;
      if (!Array.isArray(data.data[i].Categories)){
        data.data[i].Categories = [data.data[i].Categories];
      }
      model.viewentries.push(data.data[i]);
    }
  });
}

function getSearchData(data){
  if (data){
    model.start(data.start);
  }
  $.ajax({
    method: "POST",
    url: model.hostname + "/search/" + model.dbname + "/MainTopic?count=" + model.count +  "&start=" + model.start(),
    data: {
      "fulltext": model.search()
    },
    headers: {"apikey": model.apikey()}
  })
  .done(function(data) {
    model.max = data.count;
    model.viewentries.removeAll();
    model.pages.removeAll();
    var pagenum = 1;
    for (var i=0; i<model.max; i = i + model.count){
      model.pages.push(new PageNum(pagenum, (pagenum - 1) * model.count));
      pagenum++;
    }
    for (var i=0; i<data.data.length; i++){
      data.data[i].From = formatNotesName(data.data[i].From);
      data.data[i].__created = moment(data.data[i].__created).format('DD-MMM-YY');
      var newurl = window.location.origin + window.location.pathname + "?db=" + model.dbname + "&unid=" + data.data[i].__unid;
      data.data[i].permalink = newurl;
      if (!Array.isArray(data.data[i].Categories)){
        data.data[i].Categories = [data.data[i].Categories];
      }
      model.viewentries.push(data.data[i]);
    }
  });
}

function formatNotesName(input){
  input = input.replace("CN=", "");
  input = input.replace("OU=", "");
  input = input.replace("O=", "");
  input = input.replace("C=", "");
  return input;
}

function gup(name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if (results == null)
    return "";
  else
    return results[1];
}
