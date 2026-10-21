import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client.js";

export default function useUnits() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/units");
      if (!Array.isArray(response.data.data)) {
        throw new Error("The units API returned an invalid response.");
      }
      setUnits(response.data.data);
    } catch (requestError) {
      setUnits([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { units, loading, error, reload };
}
