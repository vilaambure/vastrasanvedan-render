function explainMongoError(err) {
  const message = err?.message || String(err);
  const text = message.toLowerCase();

  if (text.includes("authentication failed") || text.includes("bad auth")) {
    return [
      "Authentication failed: Atlas username/password match nahi kar rahe.",
      "Atlas -> Database Access -> vastrasanvedan -> Edit -> Edit Password -> vastra2026 -> Update User",
    ].join("\n");
  }

  if (
    text.includes("whitelist") ||
    text.includes("ip address") ||
    text.includes("could not connect") ||
    text.includes("server selection") ||
    text.includes("timed out")
  ) {
    return [
      "Atlas is IP ko block kar raha hai (ya cluster unreachable hai).",
      "Atlas -> Network Access -> Add IP Address -> ALLOW ACCESS FROM ANYWHERE -> Confirm (0.0.0.0/0)",
    ].join("\n");
  }

  if (text.includes("enotfound") || text.includes("querysrv") || text.includes("getaddrinfo")) {
    return "Cluster hostname galat hai ya DNS fail ho raha hai. Atlas -> Clusters -> Connect se naya URI copy karo.";
  }

  return message;
}

module.exports = { explainMongoError };
