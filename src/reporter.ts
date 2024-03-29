import { writeFile } from 'fs';
import { join } from 'path';

module.exports = {
  write: function (results: any, options: any, done: () => void) {
    const adopted = Object.assign({}, results);
    adopted.status =
      adopted.failed === 0 && adopted.errors === 0 ? 'pass' : 'fail';

    const jsonBlob = JSON.stringify(adopted);
    const reportPath = join(options.output_folder, 'report.json');
    writeFile(reportPath, jsonBlob, (err) => {
      if (err) {
        throw new Error(err.message);
      }
      console.log(
        `Wrote JSON report file to: ${join(
          options.output_folder,
          'report.json',
        )}`,
      );
    });
    done();
  },
};
