import { useState, useCallback, useEffect, useRef } from "react";
import { parseCSVFile, parseCSVText } from "../utils/csvParser";

const DATA_SOURCE = {
  EMPTY: "empty",
  UPLOAD: "upload",
  SAMPLE: "sample",
};

// Handles inventory and sales CSV uploads with basic loading/error states.
export function useFileUploads() {
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [inventorySource, setInventorySource] = useState(DATA_SOURCE.EMPTY);
  const [salesSource, setSalesSource] = useState(DATA_SOURCE.EMPTY);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [errorInventory, setErrorInventory] = useState(null);
  const [errorSales, setErrorSales] = useState(null);

  const loadInventoryFile = useCallback(async (file) => {
    setLoadingInventory(true);
    setErrorInventory(null);

    try {
      if (!file) {
        setInventoryData([]);
        setInventorySource(DATA_SOURCE.EMPTY);
        return;
      }

      const data = await parseCSVFile(file);
      setInventoryData(Array.isArray(data) ? data : []);
      setInventorySource(DATA_SOURCE.UPLOAD);
    } catch (error) {
      setInventoryData([]);
      setInventorySource(DATA_SOURCE.EMPTY);
      setErrorInventory(error?.message || "Inventar konnte nicht geladen werden.");
    } finally {
      setLoadingInventory(false);
    }
  }, []);

  const loadSalesFile = useCallback(async (file) => {
    setLoadingSales(true);
    setErrorSales(null);

    try {
      if (!file) {
        setSalesData([]);
        setSalesSource(DATA_SOURCE.EMPTY);
        return;
      }

      const data = await parseCSVFile(file);
      setSalesData(Array.isArray(data) ? data : []);
      setSalesSource(DATA_SOURCE.UPLOAD);
    } catch (error) {
      setSalesData([]);
      setSalesSource(DATA_SOURCE.EMPTY);
      setErrorSales(error?.message || "Verkaeufe konnten nicht geladen werden.");
    } finally {
      setLoadingSales(false);
    }
  }, []);

  // Dev default: auto-load bundled CSVs so the app has data without manual upload.
  const defaultLoaded = useRef(false);
  useEffect(() => {
    if (defaultLoaded.current) return;
    if (!import.meta.env.DEV) return;
    defaultLoaded.current = true;
    const loadDefaults = async () => {
      let inventoryModule;
      let salesModule;

      try {
        [inventoryModule, salesModule] = await Promise.all([
          import("../../data/lagerbestand.csv?raw"),
          import("../../data/verk\u00e4ufe1825.csv?raw"),
        ]);
      } catch (error) {
        setErrorInventory(error?.message || "Inventar (Default) konnte nicht geladen werden.");
        setErrorSales(error?.message || "Verkaeufe (Default) konnten nicht geladen werden.");
        setInventoryData([]);
        setSalesData([]);
        setInventorySource(DATA_SOURCE.EMPTY);
        setSalesSource(DATA_SOURCE.EMPTY);
        return;
      }

      try {
        setLoadingInventory(true);
        const inv = parseCSVText(inventoryModule.default);
        setInventoryData(Array.isArray(inv) ? inv : []);
        setInventorySource(DATA_SOURCE.SAMPLE);
      } catch (error) {
        setErrorInventory(error?.message || "Inventar (Default) konnte nicht geladen werden.");
        setInventoryData([]);
        setInventorySource(DATA_SOURCE.EMPTY);
      } finally {
        setLoadingInventory(false);
      }

      try {
        setLoadingSales(true);
        const salesParsed = parseCSVText(salesModule.default);
        setSalesData(Array.isArray(salesParsed) ? salesParsed : []);
        setSalesSource(DATA_SOURCE.SAMPLE);
      } catch (error) {
        setErrorSales(error?.message || "Verkaeufe (Default) konnten nicht geladen werden.");
        setSalesData([]);
        setSalesSource(DATA_SOURCE.EMPTY);
      } finally {
        setLoadingSales(false);
      }
    };
    loadDefaults();
  }, []);

  return {
    inventoryData,
    salesData,
    inventorySource,
    salesSource,
    loadingInventory,
    loadingSales,
    errorInventory,
    errorSales,
    loadInventoryFile,
    loadSalesFile,
  };
}
