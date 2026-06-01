package main

import (
	"sort"
	"strings"
)

// Result is a single search hit returned to the API
type Result struct {
	DocID   int     `json:"doc_id"`
	Name    string  `json:"name"`
	Score   float64 `json:"score"`
	Snippet string  `json:"snippet"`
}

func allDocs(idx *Index) map[int]bool {
	set := make(map[int]bool, idx.N)
	for id := range idx.DocLengths {
		set[id] = true
	}
	return set
}

func docsContaining(term string, idx *Index) map[int]bool {
	set := make(map[int]bool)
	for id := range idx.InvertedIndex[strings.ToLower(strings.TrimSpace(term))] {
		set[id] = true
	}
	return set
}

func intersect(a, b map[int]bool) map[int]bool {
	out := make(map[int]bool)
	for id := range a {
		if b[id] {
			out[id] = true
		}
	}
	return out
}

func union(a, b map[int]bool) map[int]bool {
	out := make(map[int]bool)
	for id := range a {
		out[id] = true
	}
	for id := range b {
		out[id] = true
	}
	return out
}

func subtract(a, b map[int]bool) map[int]bool {
	out := make(map[int]bool)
	for id := range a {
		if !b[id] {
			out[id] = true
		}
	}
	return out
}

func search(query string, idx *Index, snippets map[int]string) []Result {
	q := strings.TrimSpace(query)
	upper := strings.ToUpper(q)

	var docSet map[int]bool
	isBoolean := false

	switch {
	case strings.Contains(upper, "AND NOT"):
		isBoolean = true
		parts := strings.SplitN(q, "AND NOT", 2)
		if len(parts) == 2 {
			docSet = subtract(
				docsContaining(parts[0], idx),
				docsContaining(parts[1], idx),
			)
		}
	case strings.Contains(upper, " AND "):
		isBoolean = true
		docSet = allDocs(idx)
		for _, p := range strings.Split(q, " AND ") {
			docSet = intersect(docSet, docsContaining(p, idx))
		}
	case strings.Contains(upper, " OR "):
		isBoolean = true
		docSet = make(map[int]bool)
		for _, p := range strings.Split(q, " OR ") {
			docSet = union(docSet, docsContaining(p, idx))
		}
	}

	if isBoolean {
		var results []Result
		for id := range docSet {
			results = append(results, Result{
				DocID:   id,
				Name:    idx.DocNames[id],
				Score:   1.0,
				Snippet: snippets[id],
			})
		}
		sort.Slice(results, func(i, j int) bool { return results[i].Name < results[j].Name })
		return results
	}

	// BM25 ranked
	terms := tokenize(q)
	scores := make(map[int]float64)
	for _, t := range terms {
		for id := range idx.DocLengths {
			scores[id] += bm25(t, id, idx)
		}
	}

	var results []Result
	for id, score := range scores {
		if score > 0 {
			results = append(results, Result{
				DocID:   id,
				Name:    idx.DocNames[id],
				Score:   score,
				Snippet: snippets[id],
			})
		}
	}
	sort.Slice(results, func(i, j int) bool { return results[i].Score > results[j].Score })
	return results
}

// autocomplete returns up to n terms from the index that start with prefix,
// ranked by document frequency (most common terms first)
func autocomplete(prefix string, idx *Index, n int) []string {
	type candidate struct {
		term string
		df   int
	}
	var matches []candidate
	for term, postings := range idx.InvertedIndex {
		if strings.HasPrefix(term, prefix) {
			matches = append(matches, candidate{term, len(postings)})
		}
	}
	sort.Slice(matches, func(i, j int) bool {
		return matches[i].df > matches[j].df
	})
	out := make([]string, 0, n)
	for i, m := range matches {
		if i >= n {
			break
		}
		out = append(out, m.term)
	}
	return out
}
