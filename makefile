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

.PHONY: all clean firefox chrome build lint

# Build with web-ext
all: prep-firefox prep-chrome build-firefox build-chrome
build: all

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

# Build for Firefox with web-ext
build-firefox:
	$(WE) build --source-dir=$(FIREFOX_BUILD_DIR) --artifacts-dir=$(FIREFOX_BUILD_DIR)/artifacts

# Build for Chrome with web-ext
build-chrome:
	$(WE) build --source-dir=$(CHROME_BUILD_DIR) --artifacts-dir=$(CHROME_BUILD_DIR)/artifacts

# Lint for Firefox with web-ext
lint-firefox:
	$(WE) lint --source-dir=$(FIREFOX_BUILD_DIR)

# Lint for Chrome with web-ext
lint-chrome:
	$(WE) lint --source-dir=$(CHROME_BUILD_DIR)

clean:
	$(RM) $(BUILD_DIR)