# Configuration
IMAGE_NAME ?= ghcr.io/loopstack-ai/postgres
IMAGE_TAG := $(IMAGE_NAME):16.9-alpine
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
		-t $(IMAGE_TAG) \
		--push \
		postgres
	@echo "✅ Built and pushed $(IMAGE_TAG) for $(PLATFORMS)"

# Build for local testing (single architecture)
build-local:
	docker build \
		-t $(IMAGE_TAG) \
		postgres
	@echo "✅ Built $(IMAGE_TAG) locally"

# Clean up builder
clean-buildx:
	docker buildx rm multiarch-builder || true
