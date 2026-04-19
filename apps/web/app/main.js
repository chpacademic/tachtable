import { bootstrapApplication } from "./bootstrap.js";
import { createTeachTableApp } from "../app.js";

bootstrapApplication({
  start: () => createTeachTableApp(),
  onFatalError: (error) => {
    console.error(error);
  },
});
