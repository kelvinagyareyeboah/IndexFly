package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	docsDir   = "sample_docs"
	indexFile = "index.json"
	port      = ":8080"
)

var (
	idx      *Index
	snippets map[int]string
)

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func json200(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func loadSnippets() {
	snippets = make(map[int]string, idx.N)
	for id, name := range idx.DocNames {
		f, err := os.Open(filepath.Join(docsDir, name))
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		if sc.Scan() {
			snippets[id] = sc.Text()
		}
		f.Close()
	}
}

func reindex() error {
	built, err := buildIndex(docsDir)
	if err != nil {
		return err
	}
	if err := saveIndex(built, indexFile); err != nil {
		return err
	}
	idx = built
	loadSnippets()
	return nil
}

// GET /api/search?q=...&page=1&limit=10
func handleSearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		json200(w, map[string]any{"results": []any{}, "total": 0, "query": "", "page": 1, "pages": 0})
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	all := search(q, idx, snippets)
	total := len(all)
	pages := (total + limit - 1) / limit

	start := (page - 1) * limit
	end := start + limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	json200(w, map[string]any{
		"query":   q,
		"results": all[start:end],
		"total":   total,
		"page":    page,
		"pages":   pages,
		"limit":   limit,
	})
}

// GET /api/autocomplete?q=...
func handleAutocomplete(w http.ResponseWriter, r *http.Request) {
	prefix := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	if len(prefix) < 2 {
		json200(w, []string{})
		return
	}
	suggestions := autocomplete(prefix, idx, 8)
	json200(w, suggestions)
}

// GET /api/reindex
func handleReindex(w http.ResponseWriter, r *http.Request) {
	if err := reindex(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json200(w, map[string]any{
		"ok":    true,
		"docs":  idx.N,
		"terms": len(idx.InvertedIndex),
	})
}

// GET /api/stats
func handleStats(w http.ResponseWriter, r *http.Request) {
	json200(w, map[string]any{
		"docs":   idx.N,
		"terms":  len(idx.InvertedIndex),
		"avg_dl": idx.AvgDL,
	})
}

func main() {
	var err error
	if _, err = os.Stat(indexFile); os.IsNotExist(err) {
		log.Println("Building index...")
		if err = reindex(); err != nil {
			log.Fatal(err)
		}
	} else {
		idx, err = loadIndex(indexFile)
		if err != nil {
			log.Fatal(err)
		}
		loadSnippets()
	}

	http.HandleFunc("/api/search", cors(handleSearch))
	http.HandleFunc("/api/autocomplete", cors(handleAutocomplete))
	http.HandleFunc("/api/reindex", cors(handleReindex))
	http.HandleFunc("/api/stats", cors(handleStats))

	fmt.Printf("\n  🔍  API running → http://localhost%s\n\n", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
