import fs from 'fs';
import path from 'path';

module.exports = {
  write: function (results: any, options: any, done: () => void) {
    const adopted = Object.assign({}, results);
    adopted.status = adopted.failed === 0 && adopted.errors === 0;

    Object.keys(results.modules).forEach((module) => {
      adopted['modules'][module].status =
        adopted['modules'][module].failedCount === 0 && adopted['modules'][module].errorsCount === 0;

      Object.keys(results['modules'][module].completed).forEach((testcase) => {
        adopted['modules'][module]['completed'][testcase].status =
          adopted['modules'][module]['completed'][testcase].failed === 0 &&
          adopted['modules'][module]['completed'][testcase].errors === 0;
      });
    });

    const jsonBlob = JSON.stringify(adopted);
    const reportPath = path.join(options.output_folder, 'vsxReport.json');
    fs.writeFileSync(reportPath, jsonBlob);

    done();
  },
};
