package main

var version = "dev"

func buildVersion() string {
	if version == "" {
		return "dev"
	}
	return version
}
