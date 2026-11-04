import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
export function localPerformanceReports() {
  return {
    name: "frontier-local-performance",
    configureServer(server) {
      server.middlewares.use("/__frontier_performance", async (req, res) => {
        if (
          req.method !== "POST" ||
          req.headers["x-frontier-profile"] !== "1"
        ) {
          res.statusCode = 404;
          res.end();
          return;
        }
        try {
          if (
            req.headers.origin &&
            new URL(req.headers.origin).host !== req.headers.host
          ) {
            res.statusCode = 403;
            res.end();
            return;
          }
        } catch {
          res.statusCode = 400;
          res.end();
          return;
        }
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 32768) {
            res.statusCode = 413;
            res.end();
            return;
          }
        }
        try {
          const report = JSON.parse(body);
          if (!/^[a-z0-9]{1,32}$/.test(report.session))
            throw Error("Invalid session");
          const directory = path.join(server.config.root, "diagnostics");
          await mkdir(directory, { recursive: true });
          await writeFile(
            path.join(directory, `frame-${report.session}.json`),
            JSON.stringify(report, null, 2),
          );
          await appendFile(
            path.join(directory, `history-${report.session}.jsonl`),
            JSON.stringify(report) + "\n",
          );
          res.statusCode = 204;
          res.end();
        } catch {
          res.statusCode = 400;
          res.end();
        }
      });
    },
  };
}
