using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [
    (name = "tests", worker = (
      modules = [
        (name = "runtime-tests.mjs", esModule = embed "runtime-tests.mjs"),
        (name = "worker.js", esModule = embed "../dist/worker.js")
      ],
      compatibilityDate = "2026-10-08",
      globalOutbound = (name = "blocked")
    )),
    (name = "blocked", network = (allow = []))
  ]
);
