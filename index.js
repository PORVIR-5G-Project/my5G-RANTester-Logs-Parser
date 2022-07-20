const readline = require("readline");
const fs = require("fs");

const ANALYTICS_FLAG = "[ANALYTICS]";

const args = process.argv.slice(2);
const input_file = args[0];
const output_file = args[1];

if (!input_file || !output_file) {
  console.log(`\nUse: ${process.argv[0]} input.txt output.csv\n`);
  process.exit(1);
}

const instream = fs.createReadStream(input_file);
const outstream = fs.createWriteStream(output_file);

const readInterface = readline.createInterface({
  input: instream,
  console: false,
});

let devices = {};
readInterface.on("line", (line) => {
  if (!line.includes(ANALYTICS_FLAG)) return;

  const index = line.indexOf(ANALYTICS_FLAG) + ANALYTICS_FLAG.length + 1;
  const data_str = line.slice(index, -1);

  const data = data_str.split(", ");

  let device = devices[data[1]] ?? { type: parseInt(data[0]), tasks: {} };
  device.tasks[data[2]] = parseInt(data[3]);
  devices[data[1]] = device;
});

let devices_processed = {};
instream.on("end", () => {
  // Process data based on the "StartRegistration" timestamp
  Object.keys(devices).forEach((key) => {
    let device = devices_processed[key] ?? { type: devices[key].type, tasks: {} };

    const tasks = devices[key].tasks;
    Object.keys(tasks).forEach((task) => {
      if (task == "StartRegistration") return;

      device.tasks[task] = (tasks[task] - tasks["StartRegistration"]) / (1000.0 * 1000.0); // Convert to ms
      devices_processed[key] = device;
    });
  });

  // Generate CSV header
  const task_headers = getTasksNameCsv(devices_processed);
  const headers = ["id", "type"].concat(task_headers);
  outstream.write(headers.join(","));

  // Generate CSV data per device processed
  Object.entries(devices_processed).forEach(([key, value]) => {
    const tasks_str = getTaskValuesCsv(value, task_headers);
    const line = `${key},${value.type},${tasks_str}`;
    outstream.write(`\n${line}`);
  });

  // Flush file data
  outstream.end();
});

function getTasksNameCsv(devices) {

  // Get all keys
  let keys = [];
  Object.entries(devices).forEach(([key, value]) => {
    Object.keys(value.tasks).forEach((task) => {
      keys.push(task);
    });
  });

  // Remove duplicates
  return [...new Set(keys)];
}

function getTaskValuesCsv(device, task_headers) {
  let tasks = [];
  task_headers.forEach((task) => {
    tasks.push(device.tasks[task]);
  });

  return tasks.join(",");
}
