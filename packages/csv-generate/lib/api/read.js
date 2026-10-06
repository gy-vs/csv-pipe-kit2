// True when appending `separator` after `value` would let a parser find
// `separator` starting inside `value`. Besides the value containing the
// whole separator, this also covers boundary fusion: a value whose tail
// is a non-empty prefix of a multi-character separator merges with the
// appended separator (eg value "a;" + delimiter ";;" => "a;;;", matched
// at offset 1). Such values must be quoted to be parsed back.
const emits_separator = function (value, separator) {
  return (
    separator.length !== 0 &&
    (value.indexOf(separator) !== -1 ||
      (separator.length > 1 &&
        (value + separator).indexOf(separator) < value.length))
  );
};

// Serialize a field following RFC 4180: a value containing the delimiter,
// the row delimiter, a quote or a line break is enclosed in quotes and
// its inner quotes are doubled. Parsers such as csv-parse recognize "\r",
// "\n" and "\r\n" as record delimiters by default, so line breaks must
// always trigger quoting for the text output to describe the same records
// as `objectMode`.
const stringify_field = function (value, options) {
  if (value === null) {
    return "";
  }
  if (typeof value !== "string") {
    return `${value}`;
  }
  if (
    value.indexOf('"') !== -1 ||
    value.indexOf("\r") !== -1 ||
    value.indexOf("\n") !== -1 ||
    emits_separator(value, options.delimiter) ||
    emits_separator(value, options.rowDelimiter)
  ) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
};

const read = (options, state, size, push, close) => {
  // Already started
  const data = [];
  let recordsLength = 0;
  // Get remaining buffer when fixedSize is enable
  if (options.fixedSize) {
    recordsLength = state.fixed_size_buffer.length;
    if (recordsLength !== 0) {
      data.push(state.fixed_size_buffer);
    }
  }
  // eslint-disable-next-line
  while(true){
    // Exit
    if (
      state.count_created === options.length ||
      (options.end && Date.now() > options.end) ||
      (options.duration && Date.now() > state.start_time + options.duration)
    ) {
      // Flush
      if (data.length) {
        if (options.objectMode) {
          for (const record of data) {
            push(record);
          }
        } else {
          push(data.join("") + (options.eof ? options.eof : ""));
        }
        state.end = true;
      } else {
        close();
      }
      return;
    }
    // Create the record
    let record = [];
    let recordLength;
    for (const fn of options.columns) {
      const result = fn({ options: options, state: state });
      const type = typeof result;
      if (result !== null && type !== "string" && type !== "number") {
        close(
          Error(
            [
              "INVALID_VALUE:",
              "values returned by column function must be",
              "a string, a number or null,",
              `got ${JSON.stringify(result)}`,
            ].join(" "),
          ),
        );
        return;
      }
      record.push(result);
    }
    // Obtain record length
    if (options.objectMode) {
      recordLength = 0;
      // recordLength is currently equal to the number of columns
      // This is wrong and shall equal to 1 record only
      for (const column of record) {
        recordLength += column.length;
      }
    } else {
      // Stringify the record, quoting and escaping the fields so that
      // the text output can be parsed back into the same records, eg
      // by csv-parse with the same delimiter.
      record =
        (state.count_created === 0 ? "" : options.rowDelimiter) +
        record
          .map((value) => stringify_field(value, options))
          .join(options.delimiter);
      recordLength = record.length;
    }
    state.count_created++;
    if (recordsLength + recordLength > size) {
      if (options.objectMode) {
        data.push(record);
        for (const record of data) {
          push(record);
        }
      } else {
        if (options.fixedSize) {
          state.fixed_size_buffer = record.substr(size - recordsLength);
          data.push(record.substr(0, size - recordsLength));
        } else {
          data.push(record);
        }
        push(data.join(""));
      }
      return;
    }
    recordsLength += recordLength;
    data.push(record);
  }
};

export { read };
