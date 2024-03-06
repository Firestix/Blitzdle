/* eslint-disable no-console */
/* eslint-env browser, es6 */
/* exported setCookie, getCookie, eatCookie*/
/**
* Creates and returns an element with the provided tagname.
* 
* The first argument is the child node's tag name, represented as a string.
* 
* Passing an object with key:value pairs will set the new element's attributes.
* 
* Passing a string will append it to the new element as a TextNode.
* 
* Passing an Element, Node, or NodeList will append those to the new element as it's own children.
* 
* If you pass a callback function, it will be executed after appending. The callback has the newly created childNode as it's argument.
* 
* Arguments for this can be called in any order, as long as a tag name is the first argument.
* 
* @param {string} tagName - The element tag type.
* @param {Object} [attributes] - The attributes for the element in the form of a Javascript Object.
* @param {string|Element|Node|NodeList} [innerHTML] - The inner contents of this tag, either as a text string, NodeList or another element. Elements in a NodeList will be appended to the Element in the order they appear.
* @param {number} [insertionIndex] - The array position of the node to insert the childNode, with 0 being the very beginning of the childNode NodeList. By default, the new node is appended to the end of the list (Element.childNodes.length).
* @param {Function} [callback] - A callback function executed after the element has been appended, with the element as it's parameter.
* @returns {HTMLElement} The element created.
* @example <caption>Create a p element with the words "Hello World!" and append it to the document.</caption>
* var p = document.quickElement("p","Hello World!");
* document.documentElement.appendChild(p);
*
* console.log(document.documentElement.outerHTML);
* 
* //<html><p>Hello World!</p></html>
*/
Document.prototype.quickElement = function(tagName,...args) {
    try {
        var attributes = {};
        var iHTML = "";
        var callback = function(){};
        var doc = this;
        for (var arg of args) {
            switch (arg.constructor.name) {
                case "String":
                case "Node":
                case "NodeList":
                case "Element":
                    iHTML = arg;
                    break;
                case "Object":
                    attributes = arg;
                    break;
                case "Function":
                    callback = arg;
                    break;
                case "Number":
                    //Numbers can be used for createChildNode. 
                    break;
                default:
                    throw "Expected String, Node, NodeList, Attribute Object, Number, or Callback Function in arguments, got " + arg.constructor.name;
            }
        }
        var e = doc.createElement(tagName);
        for (var a in attributes) {
            e.setAttribute(a,attributes[a]);
        }
        if (typeof iHTML === 'string') {
            e.appendChild(doc.createTextNode(iHTML))
        } else if (iHTML instanceof Node) {
            e.appendChild(iHTML);
        } else if (iHTML instanceof NodeList) {
            while (iHTML.length > 0) {
                e.appendChild(iHTML[0]);
            } 
        }
        callback(e);
        return e;
    } catch (e) {
        console.error(e);
    }
}
 /**
 * Creates a new element and appends it to the element this function was called from.
 * 
 * The new ChildNode will be appended to the end of it's parent's childNode. If you pass a number as an argument, it will instead be inserted before the ChildNode at that index.
 * 
 * @param {string} tagName - The element tag type.
 * @param {Object} [attributes] - The attributes for the element in the form of a Javascript Object.
 * @param {string|Element|Node|NodeList} [innerHTML] - The inner contents of this tag, either as a text string, NodeList or another element. Elements in a NodeList will be appended to the Element in the order they appear.
 * @param {number} [insertionIndex] - The array position of the node to insert the childNode, with 0 being the very beginning of the childNode NodeList. By default, the new node is appended to the end of the list (Element.childNodes.length).
 * @param {Function} [callback] - A callback function executed after the element has been appended, with the element as it's parameter.
 * @returns {HTMLElement} The element created.
 * @example <caption>Create a div inside another div. The child div will have the class "foo" and the id "bar". The inner HTML of the child div will contain a p element with the phrase "Hello World".</caption>
 *
 * var p = document.createElement("p");
 * p.appendChild(document.createTextNode("Hello World"));
 * 
 * var div = document.createElement("div");
 * div.createChildNode("div",{class:"foo",id:"bar"},p);
 * 
 * console.log(div.outerHTML);
 * 
 * //<div><div class="foo" id="bar"><p>Hello World!</p></div></div>
 * @example <caption>Create a form element. Create a div child node inside the form. Create a button inside the div that executes the function sayHello().</caption>
 * 
 * function sayHello() {
 * alert("Hello World!");
 * }
 * 
 * var form = document.createElement("form");
 * form.createChildNode("div",function(div){
 * div.createChildNode("button",{onclick:"sayHello()"},"Click Me!");
 * });
 * 
 * console.log(form.outerHTML);
 * 
 * //<form><div><button onclick="sayHello()">Click Me!</button></div></form>
 * @example <caption>Same as the previous example, except the function to say hello is generated in the code.</caption>
 * var form = document.createElement("form");
 * form.createChildNode("div",function(div){
 * div.createChildNode("button","Click Me!",function(button){
 * button.onclick = function () {
 * alert("Hello World!");
 * };
 * });
 * });
 * console.log(form.outerHTML);
 * 
 * //<form><div><button>Click Me!</button></div></form>
 */
Element.prototype.createChildNode = function(tagName,...args) {
    try {
        var nodePos = this.childNodes.length;
        for (var arg of args) {
            if (arg.constructor.name == "Number") {
                nodePos = arg < nodePos ? arg : nodePos;
                break;
            }
        }
        var e = this.ownerDocument.quickElement(tagName,...args);
        if (nodePos >= this.childNodes.length) {
            var returnElement = this.appendChild(e);
        } else {
            returnElement = this.insertBefore(e,this.childNodes[nodePos]);
        }
        return returnElement;
    } catch (e) {
        console.error(e);
    }
}