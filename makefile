# Makefile

# Directories
SRC_DIR = src
BUILD_DIR = build
FIREFOX_BUILD_DIR = $(BUILD_DIR)/firefox
CHROME_BUILD_DIR = $(BUILD_DIR)/chrome

# Commands
MKDIR_P = mkdir -p
RM = rm -rf
CP = cp -r
MV = mv
WE = web-ext

# Gecko extension IDs
# Release ID is the store-published ID (in manifest-firefox.json source).
# Dev ID is used for local testing to avoid sharing storage with the store version.
GECKO_RELEASE_ID = {e4a90df4-3bc1-11ee-be56-0242ac120002}
GECKO_DEV_ID = {94a27906-e3da-4252-8e5e-402092f8d9aa}

.PHONY: all clean firefox chrome build lint dev

# Build with web-ext (release — uses the store gecko ID)
all: prep-firefox prep-chrome build-firefox build-chrome
build: all

# Build for local dev/testing (uses a separate gecko ID to protect store data)
dev: prep-firefox prep-chrome swap-gecko-dev build-firefox build-chrome

# Lint with web-ext
lint: prep-firefox prep-chrome lint-firefox lint-chrome

# Prep build directories for Firefox
prep-firefox:
	$(MKDIR_P) $(FIREFOX_BUILD_DIR)
	$(CP) $(SRC_DIR)/* $(FIREFOX_BUILD_DIR)
	$(MV) $(FIREFOX_BUILD_DIR)/manifest-firefox.json $(FIREFOX_BUILD_DIR)/manifest.json
	$(RM) $(FIREFOX_BUILD_DIR)/manifest-chrome.json

# Prep build directories for Chrome
prep-chrome:
	$(MKDIR_P) $(CHROME_BUILD_DIR)
	$(CP) $(SRC_DIR)/* $(CHROME_BUILD_DIR)
	$(MV) $(CHROME_BUILD_DIR)/manifest-chrome.json $(CHROME_BUILD_DIR)/manifest.json
	$(RM) $(CHROME_BUILD_DIR)/manifest-firefox.json

# Swap the gecko ID to the dev ID in the Firefox build (for safe local testing)
# Uses a temp file instead of sed -i for macOS/BSD portability
swap-gecko-dev:
	sed 's/$(GECKO_RELEASE_ID)/$(GECKO_DEV_ID)/' $(FIREFOX_BUILD_DIR)/manifest.json > $(FIREFOX_BUILD_DIR)/manifest.json.tmp
	$(MV) $(FIREFOX_BUILD_DIR)/manifest.json.tmp $(FIREFOX_BUILD_DIR)/manifest.json

# Build for Firefox with web-ext
build-firefox:
	$(WE) build --source-dir=$(FIREFOX_BUILD_DIR) --artifacts-dir=$(FIREFOX_BUILD_DIR)/artifacts

# Build for Chrome with web-ext
build-chrome:
	$(WE) build --source-dir=$(CHROME_BUILD_DIR) --artifacts-dir=$(CHROME_BUILD_DIR)/artifacts

# Lint for Firefox with web-ext
lint-firefox:
	$(WE) lint --source-dir=$(FIREFOX_BUILD_DIR)

# Lint for Chrome with web-ext (will produce warnings)
lint-chrome:
	$(WE) lint --source-dir=$(CHROME_BUILD_DIR)

clean:
	$(RM) $(BUILD_DIR)