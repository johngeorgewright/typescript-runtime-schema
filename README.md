# typescript-runtime-schema
Mono repository for packages related to the runtime schema typescript transformer.

## Packages

| Package                                                                                                                         | Status                                                         | Description                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [@typescript-runtime-schema/lib](/lib)                                                                                          | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | The main library of @typescript-runtime-schema providing the family of functionality revolving runtime type guarding/assertion of static types                                    |
| [@typescript-runtime-schema/expect-transformer-to-transform-source-code](/packages/expect-transformer-to-transform-source-code) | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | Expect a transformer to produce certain transpiled code given some source code                                                                                                    |
| [@typescript-runtime-schema/generate-docs](/packages/generate-docs)                                                             | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | Generate opinionated documentation from source files and/or provided content                                                                                                      |
| [@typescript-runtime-schema/is](/packages/is)                                                                                   | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | `is` function to type guard against given type. You could consider it to be the swiss knife of type guards. To be used in conjunction with `@typescript-runtime-schema/transform` |
| [@typescript-runtime-schema/javascript-template-tag](/packages/javascript-template-tag)                                         | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | A javascript template tag for making sure the template string contains valid javascript                                                                                           |
| [@typescript-runtime-schema/omit-deep](/packages/omit-deep)                                                                     | ![version: 1.0.0](https://badgen.net/badge/version/1.0.0/blue) | Recursively omit the specified keys from an object                                                                                                                                |

## License
MIT License Copyright (c) 2020 Simon Johansson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.