using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
  services = [
    (name = "main", worker = .worker),
    (name = "blocked", network = (allow = []))
  ],
  sockets = [(name = "http", address = "127.0.0.1:8787", http = (), service = "main")]
);
const worker :Workerd.Worker = (
  modules = [(name = "worker.js", esModule = embed "../dist/worker.js")],
  compatibilityDate = "2026-10-08",
  globalOutbound = (name = "blocked")
);
