from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="algo-zk-oracle-sdk",
    version="1.0.0",
    author="ALGO ZK Oracle Team",
    author_email="contact@algo-zk-oracle.com",
    description="Python SDK for ALGO ZK Price Oracle with Zero-Knowledge proof verification",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/oguzhaangumuss/algo-price-predict",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=[
        "httpx>=0.24.0",
        "pydantic>=1.10.0",
        "typing-extensions>=4.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=22.0.0",
            "isort>=5.0.0",
            "mypy>=1.0.0",
        ],
    },
    keywords=[
        "algorand",
        "price-oracle",
        "zero-knowledge",
        "zk-snark",
        "machine-learning",
        "prediction",
        "cryptocurrency",
        "blockchain",
    ],
)