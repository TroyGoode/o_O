!function() {

 /*                                         	HTML binding for Lulz 
                        ,ad8888ba,            
                       d8"'    `"8b           Power of KnockoutJS, with the agility of Backbone
                      d8'        `8b     
 ,adPPYba,            88          88          Elegantly binds objects to HTML
a8"     "8a           88          88     
8b       d8           Y8,        ,8P          Proxies through jQuery (or whatever $ is)
"8a,   ,a8"            Y8a.    .a8P           
 `"YbbdP"'              `"Y8888Y"'            Automatic dependency resolution
                                         
           888888888888                       Plays well with others
							
																odel							(c) 2012 by Jonah Fox (weepy), MIT Licensed */



function o_O() {};

// shims for IE compatability


function forEach(array, action) {
  if(array.forEach) return array.forEach(action)  
  for (var i= 0, n= array.length; i<n; i++)
    if (i in array)
      action.call(null, array[i], i, array);
}

function trim(s) {
  return s.replace(/^\s+|\s+$/g, '')
}
typeof module != 'undefined' ? module.exports = o_O : window.o_O = o_O



/* * * * * * * * *   _   _        
 *   _____ _____ _ _| |_(_)______ 
 *  / -_) V / -_) ' \  _| |_ / -_)
 *  \___|\_/\___|_||_\__|_/__\___|     
 *
 * adapted from backbone */

!function() {

var slice = Array.prototype.slice

var methods = {	
 /*
	* Create an immutable callback list, allowing traversal during modification. The tail is an empty object that will always be used as the next node.
	* */
	on: function(events, callback, context) {
	  var ev;
	  events = events.split(/\s+/);
	  var calls = this._callbacks || (this._callbacks = {});
	  while (ev = events.shift()) {

	    var list  = calls[ev] || (calls[ev] = {});
	    var tail = list.tail || (list.tail = list.next = {});
	    tail.callback = callback;
	    tail.context = context;
	    list.tail = tail.next = {};
	  }
	  return this;
	},

 /* 
 	* Remove one or many callbacks. If context is null, removes all callbacks with that function. 
  * If callback is null, removes all callbacks for the event. 
	* If ev is null, removes all bound callbacks for all events.
	* */
	off: function(events, callback, context) {
	  var ev, calls, node;
	  if (!events) {
	    delete this._callbacks;
	  } else if (calls = this._callbacks) {
	    events = events.split(/\s+/);
	    while (ev = events.shift()) {
	      node = calls[ev];
	      delete calls[ev];
	      if (!callback || !node) continue;

	    	// Create a new list, omitting the indicated event/context pairs.

	      while ((node = node.next) && node.next) {
	        if (node.callback === callback &&
	          (!context || node.context === context)) continue;
	        this.on(ev, node.callback, node.context);
	      }
	    }
	  }
	  return this;
	},
 /*
  * Trigger an event, firing all bound callbacks. Callbacks are passed the same arguments as emit is, apart from the event name. 
  * Listening for "*" passes the true event name as the first argument.
  * */
  emit: function(events) {
    var event, node, calls, tail, args, all, rest;
    if (!(calls = this._callbacks)) return this;
    all = calls['*'];
    (events = events.split(/\s+/)).push(null);

    // Save references to the current heads & tails.
    while (event = events.shift()) {
      if (all) events.push({next: all.next, tail: all.tail, event: event});
      if (!(node = calls[event])) continue;
      events.push({next: node.next, tail: node.tail});
    }

    //Traverse each list, stopping when the saved tail is reached.

    rest = slice.call(arguments, 1);
    while (node = events.pop()) {
      tail = node.tail;
      args = node.event ? [node.event].concat(rest) : rest;
      while ((node = node.next) !== tail) {
        node.callback.apply(node.context || this, args);
      }
    }
    return this;
  }
}

o_O.eventize = function(obj) {
  for (var prop in methods)
    obj[prop] = methods[prop]
  return obj
}

}();

/*  
 ___                       _        
| _ \_ _ ___ _ __  ___ _ _| |_ _  _ 
|  _/ '_/ _ \ '_ \/ -_) '_|  _| || |
|_| |_| \___/ .__/\___|_|  \__|\_, |
            |_|                |__/ 

 *  Our workhorse
 *  property returns an observable
 *  that can be set like prop(val) and got like prop()
 *  it trigger's set events
 *  it also automatically figures out it's deps on other o_O.properties
 *  a function can also be passed in for computed properties
 */


/*
 * Public function to return an observable property
 * sync: whether to emit changes immediately, or in the next event loop
 */

o_O.property = function(x, name) {
  var func = (typeof x == 'function')
  var prop = func ? computed(x) : simple(x)
  
  o_O.eventize(prop)
  
  prop.change = function(fn) {
    fn
      ? prop.on('set', fn)  // setup observer
      : prop(prop())        // getset
  }
  
  prop.mirror = function(other, both) {
    other.change(function(val) {
      if(val != prop.value) prop(val)
    })
    other.change()
    both && other.mirror(prop)
  }
  
  if(name) prop._name = name
  prop.toString = function() { return '<' + (prop._name ? prop._name : '') + ':'+ prop.value + '>'}
  prop.__o_O = true

  return prop
}

o_O.property.is = function(o) { return o.__o_O == true }

/*
 * Simple registry which emits all property change from one event loop in the next
 */
var asyncEmit = (function() {
  var list = []
  var timer = null
  function run() {
    for(var i=0; i < list.length; i++) {
      var prop = list[i]
      prop.emit('set', prop.value, prop.old_value)
    }
    for(var i=0; i < list.length; i++)
      delete list[i]._emitting

    timer = null
    list = []
  }
  return function(prop) {
    if(prop._emitting) return
    list.push(prop)
    prop._emitting = true
    timer = timer || setTimeout(function() { run() }, 0)
  }
})();

// simple variable to indicate if we're checking dependencies
var checking = false
/*
 * Simple property ...
 */
function simple(defaultValue) {
  
  function prop(v) {
    if(arguments.length) {
      prop.old_value = prop.value
      prop.value = v
      prop.emit('setsync', prop.value, prop.old_value)
      asyncEmit(prop)
    } else {
      if(checking) o_O.__deps_hook.emit('get', prop)   // emit to dependency checker
    }
    return prop.value
  }
  
  prop.value = defaultValue
  prop.dependencies = []     // should depend on self?
  
  prop.incr = function(val) {
    prop(prop.value + (val || 1))
  }
  return prop
}

/*
 * Computed property ...
 */
function computed(getset) {
  
  function prop(v) {
    if(arguments.length) {
      prop.old_value = prop.value
      prop.value = getset(v)
      asyncEmit(prop)
    } else {
      prop.value = getset()
      if(checking) o_O.__deps_hook.emit('get', prop)   // emit to dependency checker
    }
    return prop.value
  }
  prop.dependencies = o_O.dependencies(prop)
  
  return prop
}



/*
 *  Hook to listen to all get events
 */
o_O.__deps_hook = o_O.eventize({})

o_O.dependencies = function(func) {
  var deps = []
  
  function add(dep) {
    if(indexOf(deps, dep) < 0 && dep != func) deps.push(dep)
  }
  
  checking = true
  o_O.__deps_hook.on('get', add)
  o_O.dependencies.lastResult = func() // run the function
  o_O.__deps_hook.off('get', add)
  checking = false
  
  return deps
}

function indexOf(array, obj, start) {
  if(array.indexOf) return array.indexOf(obj, start)  
  for (var i = (start || 0), j = array.length; i < j; i++) {
     if (array[i] === obj) { return i; }
  }
  return -1;
}


o_O.expression = function(text) {
  o_O.expression.last = text      // useful for catching syntax errors 
  return new Function('o_O', 'with(this) { return (' + text + '); } ')
}


/*
 * calculates the dependencies
 * calls the callback with the result
 * if running fn returns a function - nothing more happens
 * otherwise the callback is called with the function result everytime a dependency changes
 */

o_O.bindFunction = function(fn, callback) {
  var deps = o_O.dependencies(fn)
  var result = o_O.dependencies.lastResult
  var isEvent = typeof result == 'function'
  callback(result)
  
  // if this is an event watch for changes and reapply
  if(!isEvent) {
    forEach(deps, function(dep) {
      dep.on('set', function(value) {
        callback(fn())
      })
    })
  }
}

o_O.bindElementToRule = function(el, attr, expr, context) {
  var expression = o_O.expression(expr)
  
  var trigger = function() {
    try { 
      return expression.call(context, o_O.helpers) 
    }
    catch(e) {
      console.log('Error: el: ', el, 'expression:', expr, 'attr:', attr, 'context:', context)
      throw(e)
    }
  }

  o_O.bindFunction(trigger, function(x) {
    var y = typeof x == 'function' && !o_O.property.is(x)
          ? function() { 
              return x.apply(context, arguments)
            }
          : x

    if($.fn[attr]) {
      if(y instanceof String) y = y.toString() // strange problem
      return $(el)[attr].call($(el), y)
    } 
    
    return o_O.bindings[attr].call(context, y, $(el))
  })
}

function map(array, fn) {
  var ret = []
  for(var i=0; i<array.length;i++) ret.push(fn(array[i], i))
  return ret
}

function extractRules(str) {
  if(!str) return []
  
  var rules = trim(str).split(";")
  var ret = []
  for(var i=0; i <rules.length; i++) {
    var rule = rules[i]
    rule = trim(rule)
    if(!rule) continue // for trailing ;
    var bits = map(trim(rule).split(":"), trim)
    var attr = trim(bits.shift())
    var param = trim(bits.join(":"))
    
    ret.push([attr, param])
  }
  return ret
}

o_O.bind = function(context, dom, recursing) {
  var $el = $(dom)
  if(!recursing) context.el = $el[0]
  
  var recurse = true
  var rules = extractRules($el.attr("bind"))
  
  for(var i=0; i <rules.length; i++) {
    var method = rules[i][0]
    var param = rules[i][1]
    if(method == 'with' || method == 'foreach') recurse = false
    o_O.bindElementToRule($el, method, param, context)
  }
  $el.attr("bind",null)
  
  if(recurse) {
    $el.children().each(function(i, el) {
      o_O.bind(context, el, true)
    })
  }
  if(!recursing) context.onbind && context.onbind()
}

// o_O.bind = function(context, dom, recursing) {
//   var $el = $(dom),
//       template,
//       attr
//       
//   if(!recursing) {
//     context.el = $el[0]
//     template = $el.html()
//     attr = $el.attr('bind')
//     $el.attr('bind', null)
//     $el.html('')
//     $el.data('o_O:template', template)
//     $el.data('o_O:bind', attr)
//   }
//   
//   var recurse = true
//   var rules = extractRules(attr)
//   
//   for(var i=0; i <rules.length; i++) {
//     var method = rules[i][0]
//     var param = rules[i][1]
//     if(method == 'with' || method == 'foreach') recurse = false
//     o_O.bindElementToRule($el, method, param, context)
//   }
//   $el.attr("bind",null)
//   
//   if(recurse) {
//     $el.children().each(function(i, el) {
//       o_O.bind(context, el, true)
//     })
//   }
//   if(!recursing) context.onbind && context.onbind()
// }


function getTemplate($el) {
  var template = $el.data('o_O:template')
  if(template == null) {
    template = $el.html()
    $el.html('')
    $el.attr('bind', null) // should be here?
    $el.data('o_O:template', template)
  }
  return template
}


// converts a DOM event from an element with a value into it's value
// useful for setting properties based on form events
o_O.helpers = {}

o_O.helpers.value = function(fn) {
  return function(e) { 
    return fn.call(this, $(e.currentTarget).val(), e) 
  }
}

// helper functions
o_O.helpers.position = function(fn) {
	return function(e) {
	  var el = e.currentTarget
		var o = $(el).offset()
    fn.call(this, e.pageX - o.left, e.pageY - o.top, e)
	}
}

/*              _                    _     _           _ _                 
  ___ _   _ ___| |_ ___  _ __ ___   | |__ (_)_ __   __| (_)_ __   __ _ ___ 
 / __| | | / __| __/ _ \| '_ ` _ \  | '_ \| | '_ \ / _` | | '_ \ / _` / __|
| (__| |_| \__ \ || (_) | | | | | | | |_) | | | | | (_| | | | | | (_| \__ \
 \___|\__,_|___/\__\___/|_| |_| |_| |_.__/|_|_| |_|\__,_|_|_| |_|\__, |___/
                                                                 |___/       */

/** 
 *  Override proxy methods to $
 *  this will be the context itself
 */

o_O.bindings = {}

/* class, id, href, src shortcuts
 * usage: bind='class: myClass' 
 */

o_O.bindings['"class"'] = o_O.bindings['class'] = function(klass, $el) { $el.attr('class', klass) }
o_O.bindings['id'] = function(klass, $el) { $el.attr('id', klass) }
o_O.bindings['href'] = function(klass, $el) { $el.attr('href', klass) }
o_O.bindings['src'] = function(klass, $el) { $el.attr('src', klass) }


/* Two-way binding to a form element
 * usage: bind='value: myProperty'
 * special cases for checkbox
 */
o_O.bindings.value = function(property, $el) {

  
  $el.change(function(e) {
    var checkbox = $(this).attr('type') == 'checkbox'
    var val = checkbox ? (!!$(this).attr('checked')) : $(this).val()
    property(val, e)
  })

  if(property.on) {
    property.on('set', function(val) {
      $el.attr('type') == 'checkbox'
        ? $el.attr('checked', val) 
        : $el.val(val)
    })

    property.change() // force a change    
  }

}

/*
 * set visibility depenent on val
 */

o_O.bindings.visible = function(val, $el) {
  val ? $el.show() : $el.hide()
}


o_O.bindings['if'] = function(context, $el) {
  var template = getTemplate($el)
  $el.html(context ? template : '')
}

o_O.bindings['nif']= function(val, $el) {
  return o_O.bindings['if'](!val, $el)
}

o_O.bindings.options = function(options, $el) {
  var isArray = options instanceof Array
  
  $.each(options, function(key, value) { 
    var text = isArray ? value : key
    $el.append($("<option>").attr("value", value).html(text))
  }) 
}


/* Allows binding of a list of elements - expected to respond to forEach */

o_O.bindings.foreach = function(list, $el) {
  var template = getTemplate($el)
  // $el.html()
  //   $el.html('')
  //   $el.data('o_O:template', template)
  
  var renderOne = list.renderOne || function(item) {
    $(template).each(function(i, elem) {
      var $$ = $(elem)
      $$.appendTo($el)
      o_O.bind(item, $$)
    })
  }

  list.forEach(function(item, index) {
    renderOne(item, $el)
  })
  
  if(list.bind) {
    list.bind($el)
  }  
}

o_O.bindings['with'] = function(context, $el) {
  var template = getTemplate($el)
  $el.html(context ? template : '')
  if(context) o_O.bind(context, $el)    
}

o_O.bindings.log = function(context, $el) {
  console.log('o_O', context, $el, this)
}

/// UUID

o_O.uniqueId = function() {
  return o_O.uuid()
}
o_O.uuid = function(len, radix) {
  var chars = o_O.uuid.chars, uuid = [], i=0
  radix = radix || chars.length
  len = len || o_O.uuid.len
  for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix]
  return uuid.join('')
};
o_O.uuid.len = 8
o_O.uuid.chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')



!function() {

 /*                                         	
   _____ _               
  / ____| |              
 | |    | | __ _ ___ ___ 
 | |    | |/ _` / __/ __|
 | |____| | (_| \__ \__ \
  \_____|_|\__,_|___/___/

																							
(c) 2012 by Jonah Fox (weepy), MIT Licensed
																							
Class with observable properties, subclasses, evented
*/

function klass(o, proto) {
  if(!(this instanceof klass)) {
    return klass.extend(o, proto)
  }
  o = o || {}
  var properties = this.constructor.properties
  for(var name in properties) {
    var defaultValue = (name in o) ? o[name] : properties[name]
    this[name] = o_O.property(defaultValue, name)
    this.observeProperty(name)
  }

  if(this.constructor.type) this.type = this.constructor.type
  // if('id' in o) this.id = o.id
  this.id = o.id || o_O.uniqueId()
  this.initialize.call(this, o)
}

o_O.eventize(klass.prototype)
o_O.eventize(klass)
  
klass.extend = function(properties, proto) {    
  properties = properties || {}
  var type = properties.type
  delete properties.type
  
  function Class() { return klass.apply(this, arguments) }
  
  o_O.eventize(Class)
  o_O.inherits(this, Class)
  
  if(type) {
    klass.models[type] = Class
    Class.type = type
  }
  
  Class.properties = properties
  Class.extend = this.extend
  
  if(proto) {
    for(var i in proto)
      Class.prototype[i] = proto[i]
  }
  return Class
}

klass.properties = {}
klass.models = {}




klass.create = function(o) {
  var type = klass.models[o.type]
  return new type(o)
}



var proto = klass.prototype

proto.observeProperty = function(name) {
  var self = this
  
  this[name].on('set', function(val, old) {
    self.emit('set:' + name, self, val, old)
  })
  
  this[name].on('setsync', function(val, old) {
    if(val === old) return
    var x = {}, y = {}    
    x[name] = val
    y[name] = old
    self.emit('update', self, x, y)
  })
}

proto.toString = function() {
  return '#<'+this.type+':'+this.id+'>'
}

proto.initialize = function(o) {}

proto.valid = function() {
  return true
}

// update a json model of named values
// if resultant model is invalid - it is set back to previous values
proto.update = function(o) {
  var old = {}, props = this.constructor.properties
  for(var key in o) {
    if(key in props) {
      old[key] = this[key].value
      this[key].value = o[key]
    }
  }  
  if(this.valid()) {
    for(var key in old) {
      this[key].value = old[key]
      this[key](o[key])
    }
    this.emit('update', this, o, old)
    return old
  } 
  else {
    for(var key in old) this[key](old[key])
    return false
  }  
}

proto.destroy = function() {
  // console.log('destroy', this)
  this.emit('destroy', this)
}

proto.toJSON = function() {
  var properties = this.constructor.properties
  var json = {}
  for(var i in properties) {
    var value = this[i]()
    if(value !== properties[i]) json[i] = value
  }
  if('type' in this) json.type = this.type
  if('id' in this) json.id = this.id
  
  return json
}

proto.clone = function() {
  var json = this.toJSON()
  delete json.id
  return klass.create(json)
}

o_O.inherits = function(parent, child) { 
  child = child || function() { parent.apply(this, arguments) }
  
  // dont copy over class variables/functions
  // for (var key in parent) { 
  //   if (Object.prototype.hasOwnProperty.call(parent, key)) 
  //     child[key] = parent[key]; 
  // } 
  function ctor() { 
    this.constructor = child; 
  } 
  ctor.prototype = parent.prototype; 
  child.prototype = new ctor; 
  child.__super__ = parent.prototype; 
  return child; 
};



o_O.Class = klass




}();

/*_____      _ _           _   _             
 / ____|    | | |         | | (_)            
| |     ___ | | | ___  ___| |_ _  ___  _ __  
| |    / _ \| | |/ _ \/ __| __| |/ _ \| '_ \ 
| |___| (_) | | |  __/ (__| |_| | (_) | | | |
 \_____\___/|_|_|\___|\___|\__|_|\___/|_| |_| */

function Collection(models) {
  if(this.constructor != Collection) return new Collection(models)
  
  this.objects = {}
  this.count = o_O.property(0)
  
  o_O.eventize(this) 
  if(models) {
    for(var i=0; i< models.length;i++) {
      this.add(models[i])
    }
  }
}

var fn = Collection.prototype

fn.genId = function() {
  return ++this.genId.id
}
fn.genId.id = 0
  
fn.add = function(o) {
  o.id = o.id || this.genId()
  this.objects[o.id] = o
  
  o.collection = this
  
  if(o.on) {
    o.on('*', this._onevent, this)
    o.emit('add', o, this)
  } 
  else
    this.emit('add', o)

  this.count.incr()
}

fn._onevent = function(ev, o, collection) {
  if ((ev == 'add' || ev == 'remove') && collection != this) return
  if (ev == 'destroy') {
    this.remove(o)
  }
  this.emit.apply(this, arguments)
}

fn.filter = function(fn) {
  var ret = [];  
  this.each(function(o) {
    if(fn(o)) ret.push(o)
  })
  return ret
}

fn.find = function(i) {
  return this.objects[i]
}


fn.each = fn.forEach = function(fn) {
  this.count(); // force the dependency
  for(var i in this.objects)
    fn.call(this, this.find(i), i)
}

fn.remove = function(o) {
  delete this.objects[o.id]
  this.count.incr(-1)
  // delete o._id
  
  // o.emit('remove', o)
  //this.emit('remove', o)
  if(this == o.collection) delete o.collection
  if(o.off) {
    o.emit('remove', o, this) 
    o.off('all', this._onevent, this)
  }
}

fn.renderOne = function(item, $el) {
  $(getTemplate($el)).each(function(i, elem) {
    var $$ = $(elem)
    $$.appendTo($el)
    o_O.bind(item, $$)
  })
}

fn.bind = function($el) {
  var self = this
  
  this.on('add', function(item) {
    self.renderOne(item, $el)
  })
  
  this.on('remove', this.removeElement, this)
}

fn.removeElement = function(item) {
  $(item.el).remove()
}

fn.toString = function() {
  return '#<Collection>'
}

fn.extend = function() {
  return o_O.inherits(this)
}

o_O.Collection = Collection





///////
}();