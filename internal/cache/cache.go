package cache

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Entry is the on-disk representation of cached payloads.
type Entry[T any] struct {
	CreatedAt time.Time `json:"createdAt"`
	Payload   T         `json:"payload"`
}

// Manager handles disk-backed cache storage.
type Manager struct {
	dir string
}

// NewManager initialises a cache manager rooted at dir.
func NewManager(dir string) (*Manager, error) {
	if dir == "" {
		return nil, errors.New("cache directory not specified")
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}

	return &Manager{dir: dir}, nil
}

// Directory returns the cache directory path.
func (m *Manager) Directory() string {
	return m.dir
}

// BuildFilename creates a filesystem-safe cache filename for an org and timestamp.
func BuildFilename(org string, at time.Time) string {
	safeOrg := sanitize(org)
	stamp := at.UTC().Format("2006-01-02T15-04-05")
	return safeOrg + "-" + stamp + ".json"
}

// ReadLatest loads the most recent cache entry for the given org, if present.
func ReadLatest[T any](m *Manager, org string) (*Entry[T], error) {
	if m == nil {
		return nil, errors.New("cache manager not initialised")
	}
	if org == "" {
		return nil, errors.New("organisation must be provided")
	}

	entries, err := dirEntries(m.dir, sanitize(org)+"-")
	if err != nil {
		return nil, err
	}

	if len(entries) == 0 {
		return nil, nil
	}

	latest := filepath.Join(m.dir, entries[0])
	data, err := os.ReadFile(latest)
	if err != nil {
		return nil, err
	}

	var entry Entry[T]
	if err := json.Unmarshal(data, &entry); err != nil {
		return nil, err
	}

	return &entry, nil
}

// Write stores a payload using the current time.
func Write[T any](m *Manager, org string, payload T) (string, error) {
	return WriteAt(m, org, payload, time.Now().UTC())
}

// WriteAt stores a payload using a specific timestamp.
func WriteAt[T any](m *Manager, org string, payload T, at time.Time) (string, error) {
	if m == nil {
		return "", errors.New("cache manager not initialised")
	}
	if org == "" {
		return "", errors.New("organisation must be provided")
	}

	filename := filepath.Join(m.dir, BuildFilename(org, at))
	entry := Entry[T]{
		CreatedAt: at.UTC(),
		Payload:   payload,
	}

	data, err := json.MarshalIndent(entry, "", "  ")
	if err != nil {
		return "", err
	}

	if err := os.WriteFile(filename, data, 0o644); err != nil {
		return "", err
	}

	return filename, nil
}

func sanitize(name string) string {
	lower := strings.ToLower(name)
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '-' || r == '_':
			return r
		default:
			return '-'
		}
	}, lower)
}

func dirEntries(dir, prefix string) ([]string, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}

	var matches []string
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		name := file.Name()
		if strings.HasPrefix(name, prefix) && strings.HasSuffix(name, ".json") {
			matches = append(matches, name)
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i] > matches[j]
	})

	return matches, nil
}
