import "should";
import { parse } from "csv-parse";
import { parse as parseSync } from "csv-parse/sync";
import { stringify } from "../lib/index.js";
import { stringify as stringifySync } from "../lib/sync.js";

describe("Option `record_delimiter`", function () {
  it("validation", function () {
    stringify([], { record_delimiter: "" });
    stringify([], { record_delimiter: "," });
    stringify([], { record_delimiter: ",," });
    stringify([], { record_delimiter: Buffer.from(",") });
  });

  it("Test line breaks custom string", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "::" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC::28392898392,8.8392926E7,DEF::",
        );
        next();
      },
    );
  });

  it("Test line breaks custom buffer", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: Buffer.from("::") },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC::28392898392,8.8392926E7,DEF::",
        );
        next();
      },
    );
  });

  it("Test line breaks unix", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "unix" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC\n28392898392,8.8392926E7,DEF\n",
        );
        next();
      },
    );
  });

  it("Test line breaks unicode", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "unicode" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC\u202828392898392,8.8392926E7,DEF\u2028",
        );
        next();
      },
    );
  });

  it("Test line breaks mac", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "mac" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC\r28392898392,8.8392926E7,DEF\r",
        );
        next();
      },
    );
  });

  it("Test line breaks windows", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "windows" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544,8.8017226E7,ABC\r\n28392898392,8.8392926E7,DEF\r\n",
        );
        next();
      },
    );
  });

  it("Test line breaks ascii", function (next) {
    stringify(
      [
        ["20322051544", "8.8017226E7", "ABC"],
        ["28392898392", "8.8392926E7", "DEF"],
      ],
      { record_delimiter: "ascii", delimiter: "\u001f" },
      (err, result) => {
        if (err) return next(err);
        result.should.eql(
          "20322051544\u001f8.8017226E7\u001fABC\u001e28392898392\u001f8.8392926E7\u001fDEF\u001e",
        );
        next();
      },
    );
  });

  it("quote fields containing a carriage return with the default record delimiter", function (next) {
    // `parse` auto-detects `\n`, `\r\n` and `\r` as record delimiters, so a
    // field containing any of them must be quoted to round-trip (RFC 4180).
    stringify(
      [
        ["cr\rhere", "b"],
        ["line1\nline2", "d"],
        ["crlf\r\nhere", "f"],
      ],
      { eof: false },
      (err, data) => {
        if (err) return next(err);
        data.should.eql('"cr\rhere",b\n"line1\nline2",d\n"crlf\r\nhere",f');
        next();
      },
    );
  });

  it("fields containing line breaks parse back to the original records", function (next) {
    const records = [
      ["cr\rhere", "b"],
      ["c", "d"],
    ];
    stringify(records, (err, data) => {
      if (err) return next(err);
      parse(data, (err, parsed) => {
        if (err) return next(err);
        parsed.should.eql(records);
        next();
      });
    });
  });

  it("fields containing line breaks parse back to the original records in sync", function () {
    const records = [
      ["cr\rhere", "b"],
      ["c", "d"],
    ];
    parseSync(stringifySync(records)).should.eql(records);
  });

  it("dont quote fields containing a carriage return with a custom record delimiter", function (next) {
    // An explicit `record_delimiter` preserves the historical behavior:
    // only fields containing the configured delimiter are quoted.
    stringify(
      [["cr\rhere", "b"]],
      { record_delimiter: "\n", eof: false },
      (err, data) => {
        if (err) return next(err);
        data.should.eql("cr\rhere,b");
        next();
      },
    );
  });
});
