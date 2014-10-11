declare module relaxjs {

  export class Resource {
    private name;
    constructor(name: string);
    pippo(): void;
  }

  export class Route {
    private name;
    constructor( name: string );
    paperino() : void ;
  }

  export function relax(): string;
}

declare module "relaxjs" {
  export = relaxjs;
}
