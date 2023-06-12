build:
	docker build - t talk-with-gpt-bot .

run:
	docker run -d -p 3000:3000 --name tgbot --rm talk-with-gpt-bot