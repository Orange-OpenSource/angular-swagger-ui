
### 0.2.3 (2015-08-25)

 * Do not allow adding module multiple times (fix #17)
 * Set permalinks optional as it can cause UI being reloaded when using ngRoute if 'reloadOnSearch' not set to false
 * Check parameters at startup to give advices

### 0.2.2 (2015-08-21)

 * Allow forcing parser to JSON
 * Throw error if no parser found
 * Include Swagger validator
 * Create module Swagger 1.2 to Swagger 2.0 converter (beta)
 * Fix duplicated elements in UI

### 0.2.1 (2015-08-13)

 * Fix model generation
 * Fix JSON parser

### 0.2 (2015-08-12)

 * Allow creating and using modules
 * Create module to support Swagger external references
 * Create module to support application/xml API explorer responses to display formatted response body
 * Use the global consumes/produces definition if an operation doesn't specify its own
 * Add support for $ref definition on operation parameters
 * Use bootstrap-less-only to remove dependency to jQuery
 * Display HTML description for operations, parameters and responses. If untrusted sources, user MUST include ngSanitize to his app else he has to add trusted-sources parameter to swagger-ui directive
 * Fix models defintions circular references

### 0.1.6 (2015-07-07)

 * Fix model generation
 * Fix documentation
 * Display host, base path and version

### 0.1.5 (2015-06-24)

 * Enable permalinks
 * Autoload Swagger descriptor at startup
 * Transfer to Orange OpenSources

### 0.1.4 (2015-05-03)

 * Fix CSS
 * Fix model generation
 * Fix API explorer displayed URL

### 0.1.3 (2015-04-14)

 * Fix for operations having no tags

### 0.1.2 (2015-04-02)

 * Fix CSS
 * Display API explorer query params
 * Add support for enums
 * Fix model generation
 * Fix display on small screens

### 0.1.1 (2015-03-03)

 * Responsive tables
 * Split JS in multiple files
 * Add CSS classes to ease override
