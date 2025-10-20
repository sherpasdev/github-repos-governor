package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const (
	defaultConfigName = "config.json"
	defaultConfigDir  = "config"
	defaultUserAgent  = "github-repos-governor"
	defaultCacheDir   = ".cache"
)

// Config represents runtime configuration for the application.
type Config struct {
	GithubToken      string `json:"githubToken"`
	GithubOrg        string `json:"githubOrg"`
	GithubAPIBaseURL string `json:"githubApiBaseUrl"`
	DisableCache     bool   `json:"disableCache"`
	CacheDir         string `json:"cacheDir"`
	IgnoreArchived   bool   `json:"ignoreArchived"`

	UserAgent  string `json:"-"`
	SourcePath string `json:"-"`
}

var (
	loaded  Config
	loadErr error
	once    sync.Once
)

// Load reads configuration from disk once and caches the result.
func Load() (Config, error) {
	once.Do(func() {
		loaded, loadErr = loadConfig()
	})
	return loaded, loadErr
}

// MissingFields reports required configuration keys that are empty.
func MissingFields(cfg Config) []string {
	var missing []string
	if strings.TrimSpace(cfg.GithubToken) == "" {
		missing = append(missing, "githubToken")
	}
	if strings.TrimSpace(cfg.GithubOrg) == "" {
		missing = append(missing, "githubOrg")
	}
	return missing
}

func loadConfig() (Config, error) {
	path, exists, err := resolveConfigPath()
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		IgnoreArchived: true,
	}

	if exists {
		// #nosec G304 - path is controlled by resolveConfigPath()
		data, err := os.ReadFile(path)
		if err != nil {
			return Config{}, fmt.Errorf("read config %q: %w", path, err)
		}

		if err := json.Unmarshal(data, &cfg); err != nil {
			return Config{}, fmt.Errorf("parse config %q: %w", path, err)
		}
	}

	cfg.GithubToken = strings.TrimSpace(cfg.GithubToken)
	cfg.GithubOrg = strings.TrimSpace(cfg.GithubOrg)
	cfg.GithubAPIBaseURL = strings.TrimSpace(cfg.GithubAPIBaseURL)
	cfg.CacheDir = strings.TrimSpace(cfg.CacheDir)

	if cfg.GithubAPIBaseURL == "" {
		cfg.GithubAPIBaseURL = "https://api.github.com"
	}
	if cfg.CacheDir == "" {
		cfg.CacheDir = defaultCacheDir
	}

	cfg.UserAgent = defaultUserAgent
	cfg.SourcePath = path

	return cfg, nil
}

func resolveConfigPath() (string, bool, error) {
	if override := strings.TrimSpace(os.Getenv("GOVERNOR_CONFIG")); override != "" {
		if !filepath.IsAbs(override) {
			cwd, err := os.Getwd()
			if err != nil {
				return "", false, fmt.Errorf("determine working directory: %w", err)
			}
			override = filepath.Join(cwd, override)
		}
		override = filepath.Clean(override)
		if _, err := os.Stat(override); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return override, false, nil
			}
			return "", false, fmt.Errorf("stat %q: %w", override, err)
		}
		return override, true, nil
	}

	paths := candidatePaths()
	for _, candidate := range paths {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, true, nil
		} else if err != nil && !errors.Is(err, os.ErrNotExist) {
			return "", false, fmt.Errorf("stat %q: %w", candidate, err)
		}
	}

	if len(paths) == 0 {
		return "", false, errors.New("unable to determine configuration path")
	}

	return paths[0], false, nil
}

func candidatePaths() []string {
	cwd, _ := os.Getwd()
	var paths []string

	if cwd != "" {
		paths = append(paths,
			filepath.Join(cwd, defaultConfigName),
			filepath.Join(cwd, defaultConfigDir, defaultConfigName),
		)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		paths = append(paths,
			filepath.Join(dir, defaultConfigName),
			filepath.Join(dir, defaultConfigDir, defaultConfigName),
		)
	}

	return uniqueExistingOrder(paths)
}

func uniqueExistingOrder(paths []string) []string {
	seen := make(map[string]struct{})
	uniq := make([]string, 0, len(paths))
	for _, p := range paths {
		clean := filepath.Clean(p)
		if _, ok := seen[clean]; ok {
			continue
		}
		seen[clean] = struct{}{}
		uniq = append(uniq, clean)
	}
	return uniq
}

// MustLoad is a helper for tests or tooling that require configuration.
func MustLoad() Config {
	cfg, err := Load()
	if err != nil {
		panic(err)
	}
	return cfg
}

// Reload clears cached configuration – primarily for tests.
func Reload() {
	once = sync.Once{}
	loaded = Config{}
	loadErr = nil
}

// EnsureFile creates a default configuration file at the given path if it does not already exist.
// Not used at runtime but useful for setup tooling.
func EnsureFile(path string, cfg Config) error {
	if path == "" {
		return errors.New("path is empty")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return err
	}
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	cfg.UserAgent = ""
	cfg.SourcePath = ""
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

// Save writes the provided configuration to disk, overwriting any existing file.
func Save(path string, cfg Config) error {
	if strings.TrimSpace(path) == "" {
		return errors.New("path is empty")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return err
	}
	cfg.UserAgent = ""
	cfg.SourcePath = ""
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
