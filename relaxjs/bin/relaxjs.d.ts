/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />
/// <reference path="../typings/underscore.string/underscore.string.d.ts" />
/// <reference path="../typings/q/Q.d.ts" />
/// <reference path="../typings/mime/mime.d.ts" />
import http = require("http");
export declare class Route {
    public verb: string;
    public static: boolean;
    public pathname: string;
    public path: string[];
    public query: string;
}
export interface Resource {
    Name: string;
    get(route: Route): Q.Promise<Embodiment>;
}
export declare class Embodiment {
    private data;
    private mimeType;
    constructor(data: Buffer, mimeType: string);
    public serve(response: http.ServerResponse): void;
}
