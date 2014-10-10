
declare module relaxjs {

  export function relax(): string;

  export class Resource {
      private name;
      constructor(name: string);
      pippo(): void;
  }
}

declare module "relaxjs" {
  export = relaxjs;
}
