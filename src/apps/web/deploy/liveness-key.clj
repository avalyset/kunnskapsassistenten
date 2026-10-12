;; Stores the liveness probe's API key from LIVENESS_API_KEY, once. The seed job
;; runs it with seedScript=liveness-key.clj, while the app is not running.
;; It may read conversations (scope query) and reach no agent: the one agent
;; it names does not exist, and a non-empty list limits MCP and /v1 to it.
(require '[digdir.config.db :as config-db]
         '[digdir.config.api-keys :as api-keys]
         '[digdir.setup.common :as common])

(let [conn (config-db/get-conn)
      api-key (System/getenv "LIVENESS_API_KEY")]
  (when (or (nil? api-key) (not (re-matches #"rag_[0-9a-f]{64}" api-key)))
    (println "✘ LIVENESS_API_KEY mangler eller har feil form")
    (flush)
    (common/exit! 1))
  (if (api-keys/api-key-stored? conn api-key)
    (println "finnes alt: ka-liveness-probe")
    (do
      (api-keys/store-api-key conn api-key "ka-liveness-probe" "ka-liveness"
                              {:scopes #{:query}
                               :agent-refs ["ka-liveness-no-agent"]
                               :user-email "ka-liveness@local"})
      (println "lagret: ka-liveness-probe"))))
(flush)
(common/exit! 0)
