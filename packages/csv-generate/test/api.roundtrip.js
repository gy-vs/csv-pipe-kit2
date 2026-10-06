import "should";
import { parse } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";
import { generate } from "../lib/index.js";
import { generate as generateSync } from "../lib/sync.js";

// Values returned by the column functions contain the delimiter, quotes
// and line breaks, like fields of a real world export
const values = ["a,b", 'say "hi"', "line1\nline2", "cr\rhere"];
const columns = values.map((value) => () => value);

describe("API roundtrip", function () {
  it("text output is quoted and escaped", function (next) {
    generate({ length: 1, columns, encoding: "utf8" }, (err, data) => {
      if (err) return next(err);
      data.should.eql('"a,b","say ""hi""","line1\nline2","cr\rhere"');
      next();
    });
  });

  it("text output parses back to the objectMode records", function (next) {
    generate({ length: 2, columns, objectMode: true }, (err, records) => {
      if (err) return next(err);
      generate({ length: 2, columns, encoding: "utf8" }, (err, data) => {
        if (err) return next(err);
        parse(data, (err, parsed) => {
          if (err) return next(err);
          parsed.should.eql(records);
          next();
        });
      });
    });
  });

  it("text output respects a custom delimiter", function (next) {
    const columns = [() => "x;y", () => "z"];
    generate(
      { length: 1, columns, delimiter: ";", encoding: "utf8" },
      (err, data) => {
        if (err) return next(err);
        data.should.eql('"x;y";z');
        parse(data, { delimiter: ";" }, (err, parsed) => {
          if (err) return next(err);
          parsed.should.eql([["x;y", "z"]]);
          next();
        });
      },
    );
  });

  it("text output quotes a field fusing with a multi-character delimiter", function () {
    // The field "a|" + delimiter "||" emits "a|||", which a parser
    // re-tokenizes as a delimiter followed by "|": the field must be quoted.
    const data = generateSync({
      length: 1,
      columns: [() => "a|", () => "b"],
      delimiter: "||",
    });
    data.should.eql('"a|"||b');
    parseSync(data, { delimiter: "||" }).should.eql([["a|", "b"]]);
  });

  it("sync text output parses back to the objectMode records", function () {
    const records = generateSync({ length: 2, columns, objectMode: true });
    const data = generateSync({ length: 2, columns });
    parseSync(data).should.eql(records);
  });
});
