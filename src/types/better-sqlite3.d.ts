declare module 'better-sqlite3' {
  export interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
  }

  export interface Statement<BindParameters = any, Row = any> {
    run(...params: any[]): this;
    get(...params: any[]): Row | undefined;
    all(...params: any[]): Row[];
    iterate(...params: any[]): IterableIterator<Row>;
  }

  export interface Database {
    prepare<BindParameters = any, Row = any>(sql: string): Statement<BindParameters, Row>;
    exec(sql: string): this;
    pragma(pragma: string, simpleResult?: boolean): unknown;
    close(): void;
  }

  interface DatabaseConstructor {
    new (path: string, options?: Options): Database;
  }

  const Database: DatabaseConstructor;
  export default Database;
  export { Database, Statement, Options };
}
