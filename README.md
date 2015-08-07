# angular-swagger-ui

angular-swagger-ui is an angularJS implementation of [Swagger UI](http://swagger.io)

Swagger helps you documenting your RESTful API.

Swagger UI helps developers discovering your RESTful API by providing an online documentation with an integrated API explorer.

### Warning 
> Only Swagger 2.0 is supported

> application/xml is not supported

> Authentication is not implemented, please use 'api-explorer-transform' directive's param to customize API calls

## Quick Start

### Install original

`bower install angular-swagger-ui --save`

### Install fork

`bower install angular-swagger-ui-fork --save`

### Dependencies

1. [angularJS](https://angularjs.org)
2. [bootstrap CSS](http://getbootstrap.com)

## Demo

A builded version of the angular-swagger-ui is available at this address:

http://orange-opensource.github.io/angular-swagger-ui

## License

All code in this repository is covered by the [MIT license](http://opensource.org/licenses/MIT).
See LICENSE file for copyright details.

## Getting Started

Include angular-swagger-ui as a dependency into your application
```
<script type="text/javascript">
	angular.module('yourApp', ['swaggerUi']);
	...
</script>
```
Create an HTML element in your angularJS application's template or in your HTML page
```
<div swagger-ui url="URLToYourSwagger" api-explorer="true"></div>
```
Add swagger-ui.min.js and angular.min.js to the end of the body
```
<body>
 	...
 	<script src="yourPathToAngularJS/angular.min.js"></script>
 	<script src="yourPathToAngularSwaggerUI/dist/scripts/swagger-ui.min.js"></script>
</body>
```
Add swagger-ui.min.css and bootstrap.min.css to the head of the HTML page
```
<body>
	<head>
		...
		<link rel="stylesheet" href="yourPathToBootstrapCSS/bootstrap.min.css">
		<link rel="stylesheet" href="yourPathToAngularSwaggerUI/dist/css/swagger-ui.min.css">
  	</head>
</body>
```
## Customization

#### Enable or disable API explorer
```
<div swagger-ui url="URLToYourSwagger" api-explorer="true/false"></div>
```

#### Define an error handler to catch Swagger loading errors
```
<div swagger-ui url="URLToYourSwagger" error-handler="yourErrorHandler"></div>
```
```
$scope.yourErrorHandler = function(/*HTTP response*/ response, /*HTTP status*/ status){
	
}
```

#### Customize API explorer HTTP requests
```
<div swagger-ui url="URLToYourSwagger" api-explorer-transform="yourTransformFunction"></div>
```
```
$scope.yourTransformFunction = function(/*request options*/ options){
	
}
```
