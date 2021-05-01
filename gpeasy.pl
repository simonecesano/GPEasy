#!/usr/bin/env perl
use Mojolicious::Lite;
use Mojo::Util qw/dumper/;
use Mojo::File qw/path/;
use Mojo::JSON qw/encode_json/;

get '/' => sub {
  my $c = shift;
  $c->render(template => 'index');
};

get '/lesson' => sub { shift->render(template => 'lesson') };

get '/percorso' => sub { shift->render(template => 'percorso') };

get '/minima' => sub { shift->render(template => 'minima') };

post '/distances' => sub {
    my $c = shift;
    path('distances.json')->spurt(encode_json $c->req->json);
    $c->render(json => { done => scalar @{$c->req->json} })
};

app->start;

__DATA__
