import { useState, useCallback, useEffect, useRef } from "react";
import { parseCSVFile, parseCSVText } from "../utils/csvParser";
import inventoryCsvRaw from "../../data/lagerbestand.csv?raw";
import salesCsvRaw from "../../data/verk\u00e4ufe1825.csv?raw";

// Handles inventory and sales CSV uploads with basic loading/error states.
export function useFileUploads() {
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState([]);
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
        return;
      }

      const data = await parseCSVFile(file);
      setInventoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      setInventoryData([]);
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
        return;
      }

      const data = await parseCSVFile(file);
      setSalesData(Array.isArray(data) ? data : []);
    } catch (error) {
      setSalesData([]);
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
      try {
        setLoadingInventory(true);
        const inv = parseCSVText(inventoryCsvRaw);
        setInventoryData(Array.isArray(inv) ? inv : []);
      } catch (error) {
        setErrorInventory(error?.message || "Inventar (Default) konnte nicht geladen werden.");
        setInventoryData([]);
      } finally {
        setLoadingInventory(false);
      }

      try {
        setLoadingSales(true);
        const salesParsed = parseCSVText(salesCsvRaw);
        setSalesData(Array.isArray(salesParsed) ? salesParsed : []);
      } catch (error) {
        setErrorSales(error?.message || "Verkaeufe (Default) konnten nicht geladen werden.");
        setSalesData([]);
      } finally {
        setLoadingSales(false);
      }
    };
    loadDefaults();
  }, []);

  return {
    inventoryData,
    salesData,
    loadingInventory,
    loadingSales,
    errorInventory,
    errorSales,
    loadInventoryFile,
    loadSalesFile,
  };
}
