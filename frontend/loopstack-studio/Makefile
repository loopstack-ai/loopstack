# Configuration
ifndef IMAGE_NAME
$(error IMAGE_NAME is required. Usage: make build IMAGE_NAME=myorg/myapp)
endif
VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

# Derived variables
IMAGE_TAG := $(IMAGE_NAME):$(VERSION)
IMAGE_LATEST := $(IMAGE_NAME):latest
PLATFORMS := linux/amd64,linux/arm64

.PHONY: deploy setup-buildx

# Setup buildx builder (run once)
setup-buildx:
	@echo "🔧 Setting up buildx builder..."
	docker buildx create --name multiarch-builder --use --bootstrap || true
	docker buildx inspect --bootstrap

# Build and push multi-architecture images
deploy: setup-buildx
	@echo "🚀 Building multi-architecture images..."
	docker buildx build \
		--platform $(PLATFORMS) \
		--target production \
		-t $(IMAGE_TAG) \
		-t $(IMAGE_LATEST) \
		--push \
		.
	@echo "✅ Built and pushed $(IMAGE_TAG) for $(PLATFORMS)"

# Build for local testing (single architecture)
build-local:
	docker build \
		-t $(IMAGE_TAG) \
		-t $(IMAGE_LATEST) \
		--target production \
		.
	@echo "✅ Built $(IMAGE_TAG) locally"

# Clean up builder
clean-buildx:
	docker buildx rm multiarch-builder || true